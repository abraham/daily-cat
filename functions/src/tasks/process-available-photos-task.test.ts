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
const mockGetPhotosForDateRange = vi.fn();
vi.mock('../storage/day-storage', () => ({
  getPhotoForDate: mockGetPhotoForDate,
  savePhotoForDate: mockSavePhotoForDate,
  getPhotosForDateRange: mockGetPhotosForDateRange,
}));

// Import NotFoundError for testing
import { NotFoundError } from '../types';

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
      processingMinDate: '2025-01-01',
    });

    mockGetNextAvailablePhotoIds.mockResolvedValue([
      'photo-1',
      'photo-2',
      'photo-3',
    ]);

    mockIsPhotoIdUsed.mockResolvedValue(false);
    mockGet.mockResolvedValue(mockPhoto);
    mockGetPhotoForDate.mockResolvedValue(null); // No existing records by default
    mockGetPhotosForDateRange.mockResolvedValue([]); // No existing records by default
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
    // Create mock records for the next 30 days
    const mockRecords = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      return {
        id: dateString,
        status: 'completed',
        photo: mockPhoto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    mockGetPhotosForDateRange.mockResolvedValue(mockRecords);

    await mockScheduleHandler();

    // Should check date ranges to find ones that need photos
    expect(mockGetPhotosForDateRange).toHaveBeenCalled();

    // Since all future dates are filled, might not process any photos
    // depending on whether backwards dates need photos
  });

  it('should handle NotFoundError gracefully and continue processing', async () => {
    // Mock NotFoundError for second photo
    mockGet
      .mockResolvedValueOnce(mockPhoto) // First photo succeeds
      .mockRejectedValueOnce(new NotFoundError('Photo not found')) // Second photo not found
      .mockResolvedValueOnce(mockPhoto); // Third photo succeeds

    await mockScheduleHandler();

    // Verify that NotFoundError was logged
    expect(mockLogger.log).toHaveBeenCalledWith(
      'Photo photo-2 not found, removing from available list'
    );

    // Verify that the not found photo was removed from available list
    expect(mockRemoveAvailablePhotoId).toHaveBeenCalledWith('photo-2');

    // Verify that processing continued with other photos
    expect(mockSavePhotoForDate).toHaveBeenCalledTimes(2); // First and third photos
  });

  it('should propagate non-NotFoundError errors and stop processing', async () => {
    // Mock non-NotFoundError for second photo
    mockGet
      .mockResolvedValueOnce(mockPhoto) // First photo succeeds
      .mockRejectedValueOnce(new Error('API Error')) // Second photo fails with non-NotFoundError
      .mockResolvedValueOnce(mockPhoto); // Third photo would succeed but won't be reached

    // The function should throw the error
    await expect(() => mockScheduleHandler()).rejects.toThrow('API Error');

    // Verify that non-recoverable error was logged
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Non-recoverable error processing photo ID photo-2:',
      expect.any(Error)
    );

    // Verify that the outer error was also logged
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error in process available photos task:',
      expect.any(Error)
    );

    // Verify that only the first photo was processed before the error
    expect(mockSavePhotoForDate).toHaveBeenCalledTimes(1); // Only first photo
  });

  it('should work backwards to fill older dates when next 30 days are complete', async () => {
    // Ensure we have enough available photo IDs
    mockGetNextAvailablePhotoIds.mockResolvedValue([
      'photo-1',
      'photo-2',
      'photo-3',
    ]);

    // Mock that next 30 days have completed photos but past dates need photos
    mockGetPhotosForDateRange.mockImplementation(
      (startDate: string, endDate: string) => {
        const start = new Date(startDate);
        const end = new Date(endDate);

        const records = [];

        // The function is called with the actual current date as start date for future range
        // So we just check if this looks like a future range (starts with a current-ish date)
        const startYear = start.getFullYear();
        const daysDiff = Math.floor(
          (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
        );

        // If this looks like a ~30 day future range (around 29-30 days), return completed records
        if (daysDiff >= 28 && daysDiff <= 31 && startYear === 2025) {
          for (
            let date = new Date(start);
            date <= end;
            date.setDate(date.getDate() + 1)
          ) {
            const dateString = date.toISOString().split('T')[0];
            records.push({
              id: dateString,
              status: 'completed',
              photo: mockPhoto,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }
        // For past dates (backward search), return empty so some dates need photos

        return Promise.resolve(records);
      }
    );

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

    // Mock that only 2 dates need photos by returning records for most dates
    mockGetPhotosForDateRange.mockImplementation(
      (startDate: string, endDate: string) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const records = [];

        // Create completed records for most dates, leaving only 2 without records
        let dateCount = 0;
        for (
          let date = new Date(start);
          date <= end;
          date.setDate(date.getDate() + 1)
        ) {
          dateCount++;
          if (dateCount > 2) {
            // Only the first 2 dates need photos
            const dateString = date.toISOString().split('T')[0];
            records.push({
              id: dateString,
              status: 'completed',
              photo: mockPhoto,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }

        return Promise.resolve(records);
      }
    );

    await mockScheduleHandler();

    // Should only process 2 photos (for 2 dates that need them)
    expect(mockSavePhotoForDate).toHaveBeenCalledTimes(2);

    // Should log that all dates are filled
    expect(mockLogger.log).toHaveBeenCalledWith(
      'All dates needing photos have been filled'
    );
  });

  it('should handle errors in removing not found photo IDs', async () => {
    // Mock NotFoundError and removal error
    mockGet.mockRejectedValueOnce(new NotFoundError('Photo not found'));
    mockRemoveAvailablePhotoId.mockRejectedValueOnce(
      new Error('Removal Error')
    );

    await mockScheduleHandler();

    // Verify that both the NotFoundError and removal error were logged
    expect(mockLogger.log).toHaveBeenCalledWith(
      'Photo photo-1 not found, removing from available list'
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to remove not found photo ID photo-1:',
      expect.any(Error)
    );

    // The function should continue processing other photos despite the removal error
    expect(mockSavePhotoForDate).toHaveBeenCalledTimes(2); // Should process photo-2 and photo-3
  });

  it('should use processLimit from config to determine how many photo IDs to retrieve', async () => {
    // Mock config with different processLimit
    mockGetConfig.mockResolvedValue({
      minDate: '2025-01-01',
      importEnabled: true,
      lastPage: '5',
      importLimit: 10,
      processLimit: 5, // Different limit
      processingMinDate: '2025-01-01',
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
    const recentMinDate = '2025-06-15'; // 2 weeks ago from July 4, 2025
    mockGetConfig.mockResolvedValue({
      minDate: recentMinDate,
      importEnabled: true,
      lastPage: '5',
      importLimit: 10,
      processLimit: 3,
      processingMinDate: recentMinDate,
    });

    // Mock that next 30 days have completed photos
    mockGetPhotosForDateRange.mockImplementation(
      (startDate: string, endDate: string) => {
        const start = new Date(startDate);
        const end = new Date(endDate);

        const records = [];

        // The function is called with the actual current date as start date for future range
        // So we just check if this looks like a future range (starts with a current-ish date)
        const startYear = start.getFullYear();
        const daysDiff = Math.floor(
          (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
        );

        // If this looks like a ~30 day future range (around 29-30 days), return completed records
        if (daysDiff >= 28 && daysDiff <= 31 && startYear === 2025) {
          for (
            let date = new Date(start);
            date <= end;
            date.setDate(date.getDate() + 1)
          ) {
            const dateString = date.toISOString().split('T')[0];
            records.push({
              id: dateString,
              status: 'completed',
              photo: mockPhoto,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }
        // For backward dates, return empty (no existing records, so they need photos)

        return Promise.resolve(records);
      }
    );

    await mockScheduleHandler();

    // Should process photos for dates between minDate and today
    expect(mockSavePhotoForDate).toHaveBeenCalled();

    // Should log that it's working backwards
    expect(mockLogger.log).toHaveBeenCalledWith(
      'Next 30 days are filled, checking backwards to minDate'
    );
  });

  it('should handle config retrieval errors and propagate them', async () => {
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

  it('should handle missing client ID and propagate the error', async () => {
    // Mock missing client ID
    mockSecret.value.mockReturnValue('');

    // Should throw error about missing client ID
    await expect(() => mockScheduleHandler()).rejects.toThrow(
      'UNSPLASH_CLIENT_ID environment variable is not set'
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
      processingMinDate: '2025-01-01',
    } as any);

    // Ensure client ID is set
    mockSecret.value.mockReturnValue('test-client-id');

    await mockScheduleHandler();

    // Should still call getNextAvailablePhotoIds (with undefined, which should be handled gracefully)
    expect(mockGetNextAvailablePhotoIds).toHaveBeenCalledOnce();
  });

  it('should handle errors during photo usage check and propagate them', async () => {
    // Ensure client ID is set
    mockSecret.value.mockReturnValue('test-client-id');

    // Mock error during photo usage check
    mockIsPhotoIdUsed.mockRejectedValueOnce(new Error('Usage check failed'));

    // Should throw error and stop processing
    await expect(() => mockScheduleHandler()).rejects.toThrow(
      'Usage check failed'
    );

    // Should log the error
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error in process available photos task:',
      expect.any(Error)
    );
  });

  it('should handle errors during photo save and propagate them', async () => {
    // Ensure client ID is set
    mockSecret.value.mockReturnValue('test-client-id');

    // Mock error during photo save
    mockSavePhotoForDate.mockRejectedValueOnce(new Error('Save failed'));

    // Should throw error and stop processing
    await expect(() => mockScheduleHandler()).rejects.toThrow('Save failed');

    // Should log the error
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error in process available photos task:',
      expect.any(Error)
    );
  });

  it('should handle errors during date range retrieval and propagate them', async () => {
    // Ensure client ID is set
    mockSecret.value.mockReturnValue('test-client-id');

    // Mock error during date range retrieval
    mockGetPhotosForDateRange.mockRejectedValueOnce(
      new Error('Date range query failed')
    );

    // Should throw error and stop processing
    await expect(() => mockScheduleHandler()).rejects.toThrow(
      'Date range query failed'
    );

    // Should log the error
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error in process available photos task:',
      expect.any(Error)
    );
  });
});
