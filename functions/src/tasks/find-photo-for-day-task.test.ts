import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { DayRecord } from '../types/day';

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

// Mock the storage modules
const mockSetDayRecordProcessing = vi.fn();
vi.mock('../storage/day-storage', () => ({
  setDayRecordProcessing: mockSetDayRecordProcessing,
}));

// Mock the photo processor
const mockProcessPhotoForDay = vi.fn();
const mockUnsplashClientId = 'mock-unsplash-client-id';
vi.mock('../photo-processor', () => ({
  processPhotoForDay: mockProcessPhotoForDay,
  unsplashClientId: mockUnsplashClientId,
}));

// Mock Firebase Functions logger
const mockLogger = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
};

vi.mock('firebase-functions/logger', () => mockLogger);

// Mock Firebase Functions v2
vi.mock('firebase-functions/v2/firestore', () => ({
  onDocumentCreated: vi.fn((config, handler) => handler),
}));

describe('Find Photo for Day Task', () => {
  let findPhotoTask: typeof import('./find-photo-for-day-task');

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Reset mock responses
    mockDoc.exists = false;
    mockDoc.data.mockReturnValue({});
    mockDoc.get.mockResolvedValue(mockDoc);
    mockDoc.set.mockResolvedValue(undefined);

    mockSetDayRecordProcessing.mockResolvedValue(undefined);
    mockProcessPhotoForDay.mockResolvedValue(true);

    // Import fresh instance
    vi.resetModules();
    findPhotoTask = await import('./find-photo-for-day-task.js');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('onDayRecordCreated', () => {
    const dayId = '2024-01-15';

    it('should process a new day record with created status', async () => {
      const newDayRecord: DayRecord = {
        id: dayId,
        photo: null,
        status: 'created',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockEvent = {
        data: {
          data: () => newDayRecord,
        },
        params: { dayId },
      };

      await findPhotoTask.onDayRecordCreated(mockEvent as any);

      expect(mockLogger.log).toHaveBeenCalledWith('New day record created:', {
        dayId,
        status: 'created',
        createdAt: newDayRecord.createdAt,
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        `Processing new day record for date: ${dayId}`
      );

      expect(mockSetDayRecordProcessing).toHaveBeenCalledWith(dayId);
      expect(mockProcessPhotoForDay).toHaveBeenCalledWith(dayId, 10);
    });

    it('should not process a day record with non-created status', async () => {
      const processingDayRecord: DayRecord = {
        id: dayId,
        photo: null,
        status: 'processing',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockEvent = {
        data: {
          data: () => processingDayRecord,
        },
        params: { dayId },
      };

      await findPhotoTask.onDayRecordCreated(mockEvent as any);

      expect(mockLogger.log).toHaveBeenCalledWith('New day record created:', {
        dayId,
        status: 'processing',
        createdAt: processingDayRecord.createdAt,
      });

      expect(mockSetDayRecordProcessing).not.toHaveBeenCalled();
      expect(mockProcessPhotoForDay).not.toHaveBeenCalled();
    });

    it('should handle missing event data', async () => {
      const mockEvent = {
        data: null,
        params: { dayId },
      };

      await findPhotoTask.onDayRecordCreated(mockEvent as any);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No data associated with the event'
      );

      expect(mockSetDayRecordProcessing).not.toHaveBeenCalled();
      expect(mockProcessPhotoForDay).not.toHaveBeenCalled();
    });

    it('should log error when photo processing fails', async () => {
      mockProcessPhotoForDay.mockResolvedValue(false);

      const newDayRecord: DayRecord = {
        id: dayId,
        photo: null,
        status: 'created',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockEvent = {
        data: {
          data: () => newDayRecord,
        },
        params: { dayId },
      };

      await findPhotoTask.onDayRecordCreated(mockEvent as any);

      expect(mockProcessPhotoForDay).toHaveBeenCalledWith(dayId, 10);
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Failed to assign photo to day record ${dayId} after 10 retry attempts`
      );
    });

    it('should handle errors during processing', async () => {
      const error = new Error('Processing failed');
      mockSetDayRecordProcessing.mockRejectedValue(error);

      const newDayRecord: DayRecord = {
        id: dayId,
        photo: null,
        status: 'created',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockEvent = {
        data: {
          data: () => newDayRecord,
        },
        params: { dayId },
      };

      await findPhotoTask.onDayRecordCreated(mockEvent as any);

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error processing day record creation for ${dayId}:`,
        error
      );
    });

    it('should handle photo processing throwing an error', async () => {
      const error = new Error('Photo processing error');
      mockProcessPhotoForDay.mockRejectedValue(error);

      const newDayRecord: DayRecord = {
        id: dayId,
        photo: null,
        status: 'created',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockEvent = {
        data: {
          data: () => newDayRecord,
        },
        params: { dayId },
      };

      await findPhotoTask.onDayRecordCreated(mockEvent as any);

      expect(mockSetDayRecordProcessing).toHaveBeenCalledWith(dayId);
      expect(mockProcessPhotoForDay).toHaveBeenCalledWith(dayId, 10);
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error processing day record creation for ${dayId}:`,
        error
      );
    });

    it('should process completed day record but not call processing functions', async () => {
      const completedDayRecord: DayRecord = {
        id: dayId,
        photo: mockPhoto,
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockEvent = {
        data: {
          data: () => completedDayRecord,
        },
        params: { dayId },
      };

      await findPhotoTask.onDayRecordCreated(mockEvent as any);

      expect(mockLogger.log).toHaveBeenCalledWith('New day record created:', {
        dayId,
        status: 'completed',
        createdAt: completedDayRecord.createdAt,
      });

      expect(mockSetDayRecordProcessing).not.toHaveBeenCalled();
      expect(mockProcessPhotoForDay).not.toHaveBeenCalled();
    });
  });
});
