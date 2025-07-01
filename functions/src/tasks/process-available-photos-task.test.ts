import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Load the photo fixture for testing
const photoFixturePath = path.join(__dirname, '..', 'fixtures', 'photo.json');
const mockPhoto = JSON.parse(fs.readFileSync(photoFixturePath, 'utf8'));

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
};

const mockFirestore = {
  collection: vi.fn(() => mockCollection),
};

const mockApp = {};

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(() => mockApp),
  getApps: vi.fn(() => []),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => mockFirestore),
}));

// Mock the scheduler function
let mockScheduleHandler: any;
vi.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: vi.fn((config, handler) => {
    mockScheduleHandler = handler;
    return handler;
  }),
}));

// Mock the secret
const mockSecret = {
  value: vi.fn(() => 'test-client-id'),
};

vi.mock('../photo-processor', () => ({
  unsplashClientId: mockSecret,
}));

// Mock logger
const mockLogger = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

vi.mock('firebase-functions/logger', () => mockLogger);

// Mock the cat-api module
const mockGet = vi.fn();
vi.mock('../api/cat-api', () => ({
  get: mockGet,
}));

// Mock the config-storage module
const mockGetConfig = vi.fn();
vi.mock('../storage/config-storage', () => ({
  getConfig: mockGetConfig,
}));

// Mock the available-photo-ids-storage module
const mockGetNextAvailablePhotoIds = vi.fn();
const mockRemoveAvailablePhotoId = vi.fn();
vi.mock('../storage/available-photo-ids-storage', () => ({
  getNextAvailablePhotoIds: mockGetNextAvailablePhotoIds,
  removeAvailablePhotoId: mockRemoveAvailablePhotoId,
}));

// Mock the photo-id-storage module
const mockIsPhotoIdUsed = vi.fn();
vi.mock('../storage/photo-id-storage', () => ({
  isPhotoIdUsed: mockIsPhotoIdUsed,
}));

// Mock the day-storage module
const mockGetPhotoForDate = vi.fn();
const mockSavePhotoForDate = vi.fn();
vi.mock('../storage/day-storage', () => ({
  getPhotoForDate: mockGetPhotoForDate,
  savePhotoForDate: mockSavePhotoForDate,
}));

describe('Process Available Photos Task', () => {
  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Reset mock responses
    mockDoc.exists = false;
    mockDoc.data.mockReturnValue({});
    mockDoc.get.mockResolvedValue(mockDoc);
    mockDoc.set.mockResolvedValue(undefined);
    mockDoc.update.mockResolvedValue(undefined);
    mockDoc.delete.mockResolvedValue(undefined);

    // Reset collection mock
    mockCollection.doc.mockReturnValue(mockDoc);
    mockCollection.get.mockResolvedValue({ docs: [] });
    mockCollection.limit.mockReturnValue(mockCollection);

    // Set up default mock responses
    mockGetConfig.mockResolvedValue({
      minDate: '2025-01-01',
      importEnabled: true,
      lastPage: '5',
      importLimit: 10,
      processLimit: 10,
    });

    mockGetNextAvailablePhotoIds.mockResolvedValue([
      'photo-1',
      'photo-2',
      'photo-3',
    ]);

    mockIsPhotoIdUsed.mockResolvedValue(false);
    mockGet.mockResolvedValue(mockPhoto);
    mockGetPhotoForDate.mockResolvedValue(null); // No existing records by default
    mockSavePhotoForDate.mockResolvedValue(undefined);
    mockRemoveAvailablePhotoId.mockResolvedValue(undefined);

    // Import the task module to initialize the handler
    await import('./process-available-photos-task.js');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully process available photos for future dates', async () => {
    // Execute the scheduled function
    await mockScheduleHandler();

    // Verify that config was retrieved
    expect(mockGetConfig).toHaveBeenCalledOnce();

    // Verify that available photo IDs were retrieved with processLimit
    expect(mockGetNextAvailablePhotoIds).toHaveBeenCalledOnce();
    expect(mockGetNextAvailablePhotoIds).toHaveBeenCalledWith(10);

    // Verify that photo IDs were checked for usage
    expect(mockIsPhotoIdUsed).toHaveBeenCalledTimes(3);
    expect(mockIsPhotoIdUsed).toHaveBeenCalledWith('photo-1');
    expect(mockIsPhotoIdUsed).toHaveBeenCalledWith('photo-2');
    expect(mockIsPhotoIdUsed).toHaveBeenCalledWith('photo-3');

    // Verify that photo details were fetched
    expect(mockGet).toHaveBeenCalledTimes(3);
    expect(mockGet).toHaveBeenCalledWith(
      { clientId: 'test-client-id' },
      'photo-1'
    );

    // Verify that photos were assigned to days
    expect(mockSavePhotoForDate).toHaveBeenCalledTimes(3);

    // Verify that photo IDs were removed from available list
    expect(mockRemoveAvailablePhotoId).toHaveBeenCalledTimes(3);
    expect(mockRemoveAvailablePhotoId).toHaveBeenCalledWith('photo-1');
    expect(mockRemoveAvailablePhotoId).toHaveBeenCalledWith('photo-2');
    expect(mockRemoveAvailablePhotoId).toHaveBeenCalledWith('photo-3');
  });

  it('should skip photos that are already used', async () => {
    // Mock first photo as used, others as unused
    mockIsPhotoIdUsed
      .mockResolvedValueOnce(true) // photo-1 is used
      .mockResolvedValueOnce(false) // photo-2 is unused
      .mockResolvedValueOnce(false); // photo-3 is unused

    await mockScheduleHandler();

    // Verify that all photos were checked
    expect(mockIsPhotoIdUsed).toHaveBeenCalledTimes(3);

    // Verify that only 2 photos were fetched (skipping the used one)
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(mockGet).toHaveBeenCalledWith(
      { clientId: 'test-client-id' },
      'photo-2'
    );
    expect(mockGet).toHaveBeenCalledWith(
      { clientId: 'test-client-id' },
      'photo-3'
    );

    // Verify that only 2 photos were assigned
    expect(mockSavePhotoForDate).toHaveBeenCalledTimes(2);

    // Verify that all photos were removed from available list (including the used one)
    expect(mockRemoveAvailablePhotoId).toHaveBeenCalledTimes(3);
  });

  it('should handle empty available photo IDs list', async () => {
    mockGetNextAvailablePhotoIds.mockResolvedValue([]);

    await mockScheduleHandler();

    // Verify that config was retrieved
    expect(mockGetConfig).toHaveBeenCalledOnce();

    // Verify that available photo IDs were retrieved with processLimit
    expect(mockGetNextAvailablePhotoIds).toHaveBeenCalledOnce();
    expect(mockGetNextAvailablePhotoIds).toHaveBeenCalledWith(10);

    // Verify that no further processing occurred
    expect(mockIsPhotoIdUsed).not.toHaveBeenCalled();
    expect(mockGet).not.toHaveBeenCalled();
    expect(mockSavePhotoForDate).not.toHaveBeenCalled();
    expect(mockRemoveAvailablePhotoId).not.toHaveBeenCalled();

    // Verify appropriate log message
    expect(mockLogger.log).toHaveBeenCalledWith(
      'No available photo IDs to process'
    );
  });

  it('should handle dates that already have completed photos', async () => {
    // Mock that future dates already have completed photos
    mockGetPhotoForDate.mockResolvedValue({
      id: '2025-06-30',
      status: 'completed',
      photo: mockPhoto,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await mockScheduleHandler();

    // Should check many dates to find ones that need photos
    expect(mockGetPhotoForDate).toHaveBeenCalled();

    // Since all future dates are filled, might not process any photos
    // depending on whether backwards dates need photos
  });

  it('should handle API errors gracefully', async () => {
    // Mock API error for second photo
    mockGet
      .mockResolvedValueOnce(mockPhoto) // First photo succeeds
      .mockRejectedValueOnce(new Error('API Error')) // Second photo fails
      .mockResolvedValueOnce(mockPhoto); // Third photo succeeds

    await mockScheduleHandler();

    // Verify that error was logged
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error processing photo ID photo-2:',
      expect.any(Error)
    );

    // Verify that problematic photo was removed from available list
    expect(mockRemoveAvailablePhotoId).toHaveBeenCalledWith('photo-2');

    // Verify that processing continued with other photos
    expect(mockSavePhotoForDate).toHaveBeenCalledTimes(2); // First and third photos
  });

  it('should work backwards to fill older dates when next 30 days are complete', async () => {
    // Ensure we have enough available photo IDs
    mockGetNextAvailablePhotoIds.mockResolvedValue([
      'photo-1',
      'photo-2',
      'photo-3',
    ]);

    // Mock that next 30 days have completed photos but past dates need photos
    mockGetPhotoForDate.mockImplementation((dateString: string) => {
      const date = new Date(dateString);
      const today = new Date('2025-07-01'); // Fixed date for test consistency
      today.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);

      // For next 30 days from today (including today), all have completed photos
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(today.getDate() + 30);

      if (date >= today && date < thirtyDaysFromNow) {
        return Promise.resolve({
          id: dateString,
          status: 'completed',
          photo: mockPhoto,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Past dates need photos
      if (date < today) {
        return Promise.resolve(null);
      }

      // Dates beyond 30 days also have photos (not relevant for this test)
      return Promise.resolve({
        id: dateString,
        status: 'completed',
        photo: mockPhoto,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    await mockScheduleHandler();

    // Should process photos for past dates (at least 1, up to available photos)
    expect(mockSavePhotoForDate).toHaveBeenCalled();

    // Should log that it's working backwards
    expect(mockLogger.log).toHaveBeenCalledWith(
      'Next 30 days are filled, checking backwards to minDate'
    );
  });

  it('should stop processing when no more dates need photos', async () => {
    mockGetNextAvailablePhotoIds.mockResolvedValue([
      'photo-1',
      'photo-2',
      'photo-3',
      'photo-4',
      'photo-5',
    ]);

    // Mock that only 2 dates need photos
    let callCount = 0;
    mockGetPhotoForDate.mockImplementation(() => {
      callCount++;
      if (callCount <= 2) {
        return Promise.resolve(null); // Need photos
      }
      // All other dates have photos
      return Promise.resolve({
        status: 'completed',
        photo: mockPhoto,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    await mockScheduleHandler();

    // Should only process 2 photos (for 2 dates that need them)
    expect(mockSavePhotoForDate).toHaveBeenCalledTimes(2);

    // Should log that all dates are filled
    expect(mockLogger.log).toHaveBeenCalledWith(
      'All dates needing photos have been filled'
    );
  });

  it('should handle errors in removing problematic photo IDs', async () => {
    // Mock API error and removal error
    mockGet.mockRejectedValueOnce(new Error('API Error'));
    mockRemoveAvailablePhotoId.mockRejectedValueOnce(
      new Error('Removal Error')
    );

    await mockScheduleHandler();

    // Verify that both errors were logged
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error processing photo ID photo-1:',
      expect.any(Error)
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to remove problematic photo ID photo-1:',
      expect.any(Error)
    );
  });

  it('should use processLimit from config to determine how many photo IDs to retrieve', async () => {
    // Mock config with different processLimit
    mockGetConfig.mockResolvedValue({
      minDate: '2025-01-01',
      importEnabled: true,
      lastPage: '5',
      importLimit: 10,
      processLimit: 5, // Different limit
    });

    await mockScheduleHandler();

    // Verify that getNextAvailablePhotoIds was called with the processLimit from config
    expect(mockGetNextAvailablePhotoIds).toHaveBeenCalledWith(5);
  });

  it('should respect the processLimit when processing multiple photos', async () => {
    // Mock config with smaller processLimit
    mockGetConfig.mockResolvedValue({
      minDate: '2025-01-01',
      importEnabled: true,
      lastPage: '5',
      importLimit: 10,
      processLimit: 2,
    });

    // Mock fewer available photo IDs based on processLimit
    mockGetNextAvailablePhotoIds.mockResolvedValue(['photo-1', 'photo-2']);

    await mockScheduleHandler();

    // Verify that only 2 photos were processed
    expect(mockGetNextAvailablePhotoIds).toHaveBeenCalledWith(2);
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(mockSavePhotoForDate).toHaveBeenCalledTimes(2);
  });

  it('should respect minDate from config when checking backwards', async () => {
    // Mock config with recent minDate
    const recentMinDate = '2025-06-15'; // 2 weeks ago from July 1, 2025
    mockGetConfig.mockResolvedValue({
      minDate: recentMinDate,
      importEnabled: true,
      lastPage: '5',
      importLimit: 10,
      processLimit: 3,
    });

    // Mock that next 30 days have completed photos
    mockGetPhotoForDate.mockImplementation((dateString: string) => {
      const date = new Date(dateString);
      const today = new Date('2025-07-01'); // Fixed date for test consistency
      today.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);

      // Future dates (today and next 30 days) are complete
      if (date >= today) {
        return Promise.resolve({
          id: dateString,
          status: 'completed',
          photo: mockPhoto,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Past dates from minDate onward need photos
      const minDateObj = new Date(recentMinDate);
      minDateObj.setHours(0, 0, 0, 0);

      if (date >= minDateObj) {
        return Promise.resolve(null); // Need photos
      }

      // Dates before minDate should not be checked
      return Promise.resolve({
        id: dateString,
        status: 'completed',
        photo: mockPhoto,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    await mockScheduleHandler();

    // Should process photos for dates between minDate and today
    expect(mockSavePhotoForDate).toHaveBeenCalled();

    // Should log that it's working backwards
    expect(mockLogger.log).toHaveBeenCalledWith(
      'Next 30 days are filled, checking backwards to minDate'
    );
  });

  it('should handle config retrieval errors', async () => {
    // Mock config retrieval failure
    mockGetConfig.mockRejectedValue(new Error('Config not found'));

    // Should throw error and be caught by outer try-catch
    await expect(() => mockScheduleHandler()).rejects.toThrow(
      'Config not found'
    );

    // Should log the error
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error in process available photos task:',
      expect.any(Error)
    );
  });

  it('should handle missing processLimit in config by using default behavior', async () => {
    // Mock config without processLimit (backward compatibility)
    mockGetConfig.mockResolvedValue({
      minDate: '2025-01-01',
      importEnabled: true,
      lastPage: '5',
      importLimit: 10,
      // processLimit is missing
    } as any);

    await mockScheduleHandler();

    // Should still call getNextAvailablePhotoIds (with undefined, which should be handled gracefully)
    expect(mockGetNextAvailablePhotoIds).toHaveBeenCalledOnce();
  });
});
