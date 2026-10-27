import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { UnsplashSearch } from './unsplash';

// Load the search fixture for testing
const searchFixturePath = path.join(__dirname, 'fixtures', 'search.json');
const mockSearchResults = JSON.parse(
  fs.readFileSync(searchFixturePath, 'utf8')
) as UnsplashSearch;

// Mock Firebase Admin
const mockDoc = {
  id: '',
  exists: false,
  data: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockCollection = {
  doc: vi.fn(() => mockDoc),
  add: vi.fn(),
  where: vi.fn(() => mockCollection),
  orderBy: vi.fn(() => mockCollection),
  limit: vi.fn(() => mockCollection),
  get: vi.fn(),
  batch: vi.fn(),
};

const mockBatch = {
  set: vi.fn(),
  commit: vi.fn(),
};

const mockFirestore = {
  collection: vi.fn(() => mockCollection),
  batch: vi.fn(() => mockBatch),
};

const mockApp = {};

vi.mock('../platform/firebase', () => ({
  getApp: vi.fn(() => mockApp),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => mockFirestore),
}));

// Mock the cat-api module
const mockList = vi.fn();
vi.mock('./cat-api', () => ({
  list: mockList,
}));

// Mock the config-storage module
const mockGetConfig = vi.fn();
const mockAdvanceLastPage = vi.fn();
vi.mock('../platform/config-storage', () => ({
  getConfig: mockGetConfig,
  advanceLastPage: mockAdvanceLastPage,
}));

// Mock the photo-id-storage module
const mockIsPhotoIdUsed = vi.fn();
vi.mock('../assignment/photo-id-storage', () => ({
  isPhotoIdUsed: mockIsPhotoIdUsed,
}));

// Mock the available-photo-ids-storage module
const mockStoreMultipleAvailablePhotoIds = vi.fn();
vi.mock('./available-photo-ids-storage', () => ({
  storeMultipleAvailablePhotoIds: mockStoreMultipleAvailablePhotoIds,
}));

// Mock firebase-functions logger
const mockLogger = {
  log: vi.fn(),
  error: vi.fn(),
};
vi.mock('firebase-functions/logger', () => mockLogger);

// Mock environment variables
const originalEnv = process.env;
beforeEach(() => {
  process.env = {
    ...originalEnv,
    UNSPLASH_CLIENT_ID: 'test-client-id',
  };
});

afterEach(() => {
  process.env = originalEnv;
  vi.clearAllMocks();
});

// Mock Firebase Functions v2 scheduler
const mockScheduleHandler = vi.fn();
vi.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: vi.fn((options, handler) => {
    mockScheduleHandler.mockImplementation(handler);
    return mockScheduleHandler;
  }),
}));

describe('import-photos-task', () => {
  beforeEach(async () => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Set default mock return values
    mockGetConfig.mockResolvedValue({
      minDate: '2024-01-01',
      importEnabled: true,
      lastPage: '5',
      importLimit: 10,
      processLimit: 10,
    });

    mockList.mockResolvedValue(mockSearchResults);
    mockIsPhotoIdUsed.mockResolvedValue(false);
    mockAdvanceLastPage.mockImplementation(async (page: string) =>
      (Number(page) + 1).toString()
    );
    mockStoreMultipleAvailablePhotoIds.mockResolvedValue(undefined);

    // Import the task module to initialize the handler
    await import('./import-photos-task.js');
  });

  it('should successfully import photos when enabled', async () => {
    // Execute the scheduled function
    await mockScheduleHandler();

    // Verify that config was retrieved
    expect(mockGetConfig).toHaveBeenCalledOnce();

    // Verify that cat API was called 10 times with incremental pages
    expect(mockList).toHaveBeenCalledTimes(10);
    for (let i = 0; i < 10; i++) {
      expect(mockList).toHaveBeenNthCalledWith(i + 1, {
        clientId: 'test-client-id',
        page: (5 + i).toString(), // Starting from page 5 (lastPage)
      });
    }

    // Verify that photo IDs were checked for usage
    expect(mockIsPhotoIdUsed).toHaveBeenCalledTimes(
      mockSearchResults.results.length * 10
    );

    // Verify that available photo IDs were stored
    expect(mockStoreMultipleAvailablePhotoIds).toHaveBeenCalledTimes(10);

    // Verify that each fetched page was recorded with advanceLastPage
    expect(mockAdvanceLastPage).toHaveBeenCalledTimes(10);
    for (let i = 0; i < 10; i++) {
      expect(mockAdvanceLastPage).toHaveBeenNthCalledWith(
        i + 1,
        (5 + i).toString()
      );
    }
  });

  it('should continue from where another caller moved lastPage', async () => {
    mockGetConfig.mockResolvedValue({
      minDate: '2024-01-01',
      importEnabled: true,
      lastPage: '5',
      importLimit: 2,
      processLimit: 10,
    });
    mockAdvanceLastPage.mockResolvedValueOnce('9');

    await mockScheduleHandler();

    expect(mockList).toHaveBeenNthCalledWith(1, {
      clientId: 'test-client-id',
      page: '5',
    });
    expect(mockList).toHaveBeenNthCalledWith(2, {
      clientId: 'test-client-id',
      page: '9',
    });
  });

  it('should skip import when disabled in config', async () => {
    mockGetConfig.mockResolvedValue({
      minDate: '2024-01-01',
      importEnabled: false,
      lastPage: '5',
      importLimit: 10,
      processLimit: 10,
    });

    // Execute the scheduled function
    await mockScheduleHandler();

    // Verify that config was retrieved
    expect(mockGetConfig).toHaveBeenCalledOnce();

    // Verify that no API calls were made
    expect(mockList).not.toHaveBeenCalled();
    expect(mockAdvanceLastPage).not.toHaveBeenCalled();
    expect(mockStoreMultipleAvailablePhotoIds).not.toHaveBeenCalled();

    // Verify appropriate log message
    expect(mockLogger.log).toHaveBeenCalledWith(
      'Photo import is disabled in configuration'
    );
  });

  it('should filter out already used photo IDs', async () => {
    // Mock some photos as already used
    mockIsPhotoIdUsed.mockImplementation((photoId: string) => {
      return Promise.resolve(photoId === mockSearchResults.results[0].id);
    });

    // Execute the scheduled function
    await mockScheduleHandler();

    // Verify that available photo IDs were stored with filtered results
    expect(mockStoreMultipleAvailablePhotoIds).toHaveBeenCalledTimes(10);

    // Check that the first call doesn't include the first photo ID (which was marked as used)
    const firstCallArgs = mockStoreMultipleAvailablePhotoIds.mock.calls[0][0];
    expect(firstCallArgs).not.toContain(mockSearchResults.results[0].id);

    // But should contain the other photo IDs
    for (let i = 1; i < mockSearchResults.results.length; i++) {
      expect(firstCallArgs).toContain(mockSearchResults.results[i].id);
    }
  });

  it('should handle missing UNSPLASH_CLIENT_ID environment variable', async () => {
    delete process.env.UNSPLASH_CLIENT_ID;

    // Execute the scheduled function and expect it to throw
    await expect(mockScheduleHandler()).rejects.toThrow(
      'UNSPLASH_CLIENT_ID environment variable is not set'
    );

    // Verify that no API calls were made
    expect(mockList).not.toHaveBeenCalled();
  });

  it('should continue processing other pages if one page fails', async () => {
    // Mock API to fail on the 3rd call
    mockList.mockImplementation((options) => {
      if (options.page === '8') {
        // 5 + 3 = 8
        return Promise.reject(new Error('API error'));
      }
      return Promise.resolve(mockSearchResults);
    });

    // Execute the scheduled function
    await mockScheduleHandler();

    // Verify that all 10 API calls were attempted
    expect(mockList).toHaveBeenCalledTimes(10);

    // Verify that lastPage was advanced 3 times (before the failing page)
    expect(mockAdvanceLastPage).toHaveBeenCalledTimes(3);

    // Verify that error was logged
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error processing page 8:',
      expect.any(Error)
    );
  });

  it('should handle empty search results gracefully', async () => {
    mockList.mockResolvedValue({
      total: 0,
      total_pages: 0,
      results: [],
    });

    // Execute the scheduled function
    await mockScheduleHandler();

    // Verify that no photo IDs were checked or stored
    expect(mockIsPhotoIdUsed).not.toHaveBeenCalled();
    expect(mockStoreMultipleAvailablePhotoIds).not.toHaveBeenCalled();

    // lastPage should still be advanced 10 times
    expect(mockAdvanceLastPage).toHaveBeenCalledTimes(10);
  });
});

describe('importPage', () => {
  let importPage: typeof import('./import-photos-task').importPage;
  const page = (...ids: string[]) => ({
    total: ids.length,
    total_pages: 1,
    results: ids.map((id) => ({ id })),
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    mockIsPhotoIdUsed.mockResolvedValue(false);
    mockStoreMultipleAvailablePhotoIds.mockResolvedValue(undefined);
    ({ importPage } = await import('./import-photos-task.js'));
  });

  it('requests the page and stores the unused photo IDs', async () => {
    mockList.mockResolvedValue(page('a', 'b', 'c'));
    mockIsPhotoIdUsed.mockImplementation(async (id: string) => id === 'b');

    await expect(importPage(7, 'client')).resolves.toBe(2);

    expect(mockList).toHaveBeenCalledWith({ clientId: 'client', page: '7' });
    expect(mockStoreMultipleAvailablePhotoIds).toHaveBeenCalledWith(['a', 'c']);
  });

  it('stores nothing when every photo is used', async () => {
    mockList.mockResolvedValue(page('a', 'b'));
    mockIsPhotoIdUsed.mockResolvedValue(true);

    await expect(importPage(7, 'client')).resolves.toBe(0);
    expect(mockStoreMultipleAvailablePhotoIds).not.toHaveBeenCalled();
  });

  it('passes on errors so the caller can log the page', async () => {
    mockList.mockRejectedValue(new Error('rate limited'));

    await expect(importPage(7, 'client')).rejects.toThrow('rate limited');
  });
});
