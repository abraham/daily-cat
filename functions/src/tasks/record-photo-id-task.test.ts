import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { DayRecord } from '../types';

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

// Mock the photo-id-storage module
const mockStorePhotoId = vi.fn();
vi.mock('../storage/photo-id-storage', () => ({
  storePhotoId: mockStorePhotoId,
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
  onDocumentWritten: vi.fn((config, handler) => handler),
}));

describe('Record Photo ID Task', () => {
  let recordPhotoIdTask: typeof import('./record-photo-id-task');

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Reset mock responses
    mockDoc.exists = false;
    mockDoc.data.mockReturnValue({});
    mockDoc.get.mockResolvedValue(mockDoc);
    mockDoc.set.mockResolvedValue(undefined);

    mockStorePhotoId.mockResolvedValue(undefined);

    // Import fresh instance
    vi.resetModules();
    recordPhotoIdTask = await import('./record-photo-id-task.js');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('recordPhotoIdOnDayWrite', () => {
    const dayId = '2024-01-15';

    it('should record photo ID when a new day record is created with a photo', async () => {
      const completedDayRecord: DayRecord = {
        id: dayId,
        photo: mockPhoto,
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const eventData = {
        data: {
          before: undefined,
          after: {
            data: () => completedDayRecord,
          },
        },
        params: { dayId },
      };

      await recordPhotoIdTask.recordPhotoIdOnDayWrite(eventData as any);

      expect(mockStorePhotoId).toHaveBeenCalledWith(mockPhoto.id);
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Recording photo ID ${mockPhoto.id} for day ${dayId}`
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Successfully recorded photo ID ${mockPhoto.id}`
      );
    });

    it('should record photo ID when an existing day record is updated with a photo', async () => {
      const beforeRecord: DayRecord = {
        id: dayId,
        photo: null,
        status: 'created',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const afterRecord: DayRecord = {
        id: dayId,
        photo: mockPhoto,
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const eventData = {
        data: {
          before: {
            data: () => beforeRecord,
          },
          after: {
            data: () => afterRecord,
          },
        },
        params: { dayId },
      };

      await recordPhotoIdTask.recordPhotoIdOnDayWrite(eventData as any);

      expect(mockStorePhotoId).toHaveBeenCalledWith(mockPhoto.id);
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Recording photo ID ${mockPhoto.id} for day ${dayId}`
      );
    });

    it('should record photo ID when a day record photo is changed to a different photo', async () => {
      const oldPhoto = { ...mockPhoto, id: 'old-photo-id' };
      const newPhoto = { ...mockPhoto, id: 'new-photo-id' };

      const beforeRecord: DayRecord = {
        id: dayId,
        photo: oldPhoto,
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const afterRecord: DayRecord = {
        id: dayId,
        photo: newPhoto,
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const eventData = {
        data: {
          before: {
            data: () => beforeRecord,
          },
          after: {
            data: () => afterRecord,
          },
        },
        params: { dayId },
      };

      await recordPhotoIdTask.recordPhotoIdOnDayWrite(eventData as any);

      expect(mockStorePhotoId).toHaveBeenCalledWith('new-photo-id');
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Recording photo ID new-photo-id for day ${dayId}`
      );
    });

    it('should not record photo ID when the same photo is updated again', async () => {
      const beforeRecord: DayRecord = {
        id: dayId,
        photo: mockPhoto,
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const afterRecord: DayRecord = {
        id: dayId,
        photo: mockPhoto,
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const eventData = {
        data: {
          before: {
            data: () => beforeRecord,
          },
          after: {
            data: () => afterRecord,
          },
        },
        params: { dayId },
      };

      await recordPhotoIdTask.recordPhotoIdOnDayWrite(eventData as any);

      expect(mockStorePhotoId).not.toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Photo ID ${mockPhoto.id} already recorded for day ${dayId}`
      );
    });

    it('should not record photo ID when day record has no photo', async () => {
      const dayRecord: DayRecord = {
        id: dayId,
        photo: null,
        status: 'created',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const eventData = {
        data: {
          before: undefined,
          after: {
            data: () => dayRecord,
          },
        },
        params: { dayId },
      };

      await recordPhotoIdTask.recordPhotoIdOnDayWrite(eventData as any);

      expect(mockStorePhotoId).not.toHaveBeenCalled();
    });

    it('should handle document deletion gracefully', async () => {
      const eventData = {
        data: {
          before: {
            data: () => ({
              id: dayId,
              photo: mockPhoto,
              status: 'completed',
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
          },
          after: undefined,
        },
        params: { dayId },
      };

      await recordPhotoIdTask.recordPhotoIdOnDayWrite(eventData as any);

      expect(mockStorePhotoId).not.toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Document was deleted, no action needed'
      );
    });

    it('should handle errors when storing photo ID', async () => {
      const error = new Error('Storage error');
      mockStorePhotoId.mockRejectedValue(error);

      const dayRecord: DayRecord = {
        id: dayId,
        photo: mockPhoto,
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const eventData = {
        data: {
          before: undefined,
          after: {
            data: () => dayRecord,
          },
        },
        params: { dayId },
      };

      await recordPhotoIdTask.recordPhotoIdOnDayWrite(eventData as any);

      expect(mockStorePhotoId).toHaveBeenCalledWith(mockPhoto.id);
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error recording photo ID ${mockPhoto.id}:`,
        error
      );
    });

    it('should handle day records with photos that have no ID', async () => {
      const photoWithoutId = { ...mockPhoto, id: undefined };
      const dayRecord: DayRecord = {
        id: dayId,
        photo: photoWithoutId as any,
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const eventData = {
        data: {
          before: undefined,
          after: {
            data: () => dayRecord,
          },
        },
        params: { dayId },
      };

      await recordPhotoIdTask.recordPhotoIdOnDayWrite(eventData as any);

      expect(mockStorePhotoId).not.toHaveBeenCalled();
    });
  });
});
