import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  UnsplashPhoto,
  DayRecord,
  NewDayRecord,
  CompletedDayRecord,
} from '../src/types';

// Load the photo fixture for testing
const photoFixturePath = path.join(__dirname, 'fixtures', 'photo.json');
const mockPhoto: UnsplashPhoto = JSON.parse(
  fs.readFileSync(photoFixturePath, 'utf8')
);

// Mock Firestore
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

// Mock Firebase Admin
vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(() => mockApp),
  getApps: vi.fn(() => []),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => mockFirestore),
  DocumentData: {},
  QueryDocumentSnapshot: {},
}));

describe('Day Storage Functions', () => {
  let dayStorage: typeof import('../src/storage/day-storage');

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

    // Reset collection mock to return mockDoc by default
    mockCollection.doc.mockReturnValue(mockDoc);
    mockCollection.get.mockResolvedValue({ docs: [] });

    // Import fresh instance of day storage module
    vi.resetModules();
    dayStorage = await import('../src/storage/day-storage');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('savePhotoForDate', () => {
    it('should save a photo for a specific date with completed status', async () => {
      const testDate = '2025-06-27';

      const result = await dayStorage.savePhotoForDate(testDate, mockPhoto);

      expect(mockFirestore.collection).toHaveBeenCalledWith('days');
      expect(mockCollection.doc).toHaveBeenCalledWith(testDate);
      expect(mockDoc.set).toHaveBeenCalledWith({
        status: 'completed',
        photo: mockPhoto,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(result).toBe(testDate);
    });

    it('should use the current timestamp for createdAt and updatedAt', async () => {
      const testDate = '2025-06-27';
      const beforeTime = new Date();

      await dayStorage.savePhotoForDate(testDate, mockPhoto);

      const afterTime = new Date();
      const callArgs = mockDoc.set.mock.calls[0][0];

      expect(callArgs.createdAt).toBeInstanceOf(Date);
      expect(callArgs.updatedAt).toBeInstanceOf(Date);
      expect(callArgs.createdAt.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime()
      );
      expect(callArgs.createdAt.getTime()).toBeLessThanOrEqual(
        afterTime.getTime()
      );
      expect(callArgs.updatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime()
      );
      expect(callArgs.updatedAt.getTime()).toBeLessThanOrEqual(
        afterTime.getTime()
      );
    });
  });

  describe('createNewDayRecord', () => {
    it('should create a new day record with created status and null photo', async () => {
      const testDate = '2025-06-27';

      const result = await dayStorage.createNewDayRecord(testDate);

      expect(mockFirestore.collection).toHaveBeenCalledWith('days');
      expect(mockCollection.doc).toHaveBeenCalledWith(testDate);
      expect(mockDoc.set).toHaveBeenCalledWith({
        status: 'created',
        photo: null,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      expect(result).toEqual({
        id: testDate,
        status: 'created',
        photo: null,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should use the current timestamp for createdAt and updatedAt', async () => {
      const testDate = '2025-06-27';
      const beforeTime = new Date();

      const result = await dayStorage.createNewDayRecord(testDate);

      const afterTime = new Date();
      const callArgs = mockDoc.set.mock.calls[0][0];

      expect(callArgs.createdAt).toBeInstanceOf(Date);
      expect(callArgs.updatedAt).toBeInstanceOf(Date);
      expect(callArgs.createdAt.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime()
      );
      expect(callArgs.createdAt.getTime()).toBeLessThanOrEqual(
        afterTime.getTime()
      );
      expect(callArgs.updatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime()
      );
      expect(callArgs.updatedAt.getTime()).toBeLessThanOrEqual(
        afterTime.getTime()
      );

      expect(result.createdAt).toBe(callArgs.createdAt);
      expect(result.updatedAt).toBe(callArgs.updatedAt);
    });
  });

  describe('getPhotoForDate', () => {
    it('should return a CompletedDayRecord when document exists with completed status and photo', async () => {
      const testDate = '2025-06-27';
      const mockData = {
        photo: mockPhoto,
        status: 'completed' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDoc.exists = true;
      mockDoc.id = testDate;
      mockDoc.data.mockReturnValue(mockData);
      mockDoc.get.mockResolvedValue(mockDoc);

      const result = await dayStorage.getPhotoForDate(testDate);

      expect(mockFirestore.collection).toHaveBeenCalledWith('days');
      expect(mockCollection.doc).toHaveBeenCalledWith(testDate);
      expect(mockDoc.get).toHaveBeenCalled();
      expect(result).toEqual({
        id: testDate,
        ...mockData,
      });
      expect(result?.status).toBe('completed');
      expect(result?.photo).toBe(mockPhoto);
    });

    it('should return a NewDayRecord when document exists with created status and null photo', async () => {
      const testDate = '2025-06-27';
      const mockData = {
        photo: null,
        status: 'created' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDoc.exists = true;
      mockDoc.id = testDate;
      mockDoc.data.mockReturnValue(mockData);
      mockDoc.get.mockResolvedValue(mockDoc);

      const result = await dayStorage.getPhotoForDate(testDate);

      expect(mockFirestore.collection).toHaveBeenCalledWith('days');
      expect(mockCollection.doc).toHaveBeenCalledWith(testDate);
      expect(mockDoc.get).toHaveBeenCalled();
      expect(result).toEqual({
        id: testDate,
        ...mockData,
      });
      expect(result?.status).toBe('created');
      expect(result?.photo).toBeNull();
    });

    it('should return null when document has processing status', async () => {
      const testDate = '2025-06-27';
      const mockData = {
        photo: null,
        status: 'processing' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDoc.exists = true;
      mockDoc.id = testDate;
      mockDoc.data.mockReturnValue(mockData);
      mockDoc.get.mockResolvedValue(mockDoc);

      const result = await dayStorage.getPhotoForDate(testDate);

      expect(mockFirestore.collection).toHaveBeenCalledWith('days');
      expect(mockCollection.doc).toHaveBeenCalledWith(testDate);
      expect(mockDoc.get).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return null when document does not exist', async () => {
      const testDate = '2025-06-27';

      mockDoc.exists = false;
      mockDoc.get.mockResolvedValue(mockDoc);

      const result = await dayStorage.getPhotoForDate(testDate);

      expect(mockFirestore.collection).toHaveBeenCalledWith('days');
      expect(mockCollection.doc).toHaveBeenCalledWith(testDate);
      expect(mockDoc.get).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('updatePhotoForDay', () => {
    it('should update an existing day record with new photo', async () => {
      const testDate = '2025-06-27';
      const newPhoto = { ...mockPhoto, id: 'new-photo-id' };

      const beforeTime = new Date();
      await dayStorage.updatePhotoForDay(testDate, newPhoto);
      const afterTime = new Date();

      expect(mockFirestore.collection).toHaveBeenCalledWith('days');
      expect(mockCollection.doc).toHaveBeenCalledWith(testDate);
      expect(mockDoc.update).toHaveBeenCalledWith({
        photo: newPhoto,
        updatedAt: expect.any(Date),
      });

      const callArgs = mockDoc.update.mock.calls[0][0];
      expect(callArgs.updatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime()
      );
      expect(callArgs.updatedAt.getTime()).toBeLessThanOrEqual(
        afterTime.getTime()
      );
    });
  });

  describe('getPhotosForDateRange', () => {
    it('should return photos within date range ordered by createdAt', async () => {
      const startDate = '2025-06-25';
      const endDate = '2025-06-27';
      const mockDocs = [
        {
          id: '2025-06-25',
          data: () => ({
            photo: mockPhoto,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        },
        {
          id: '2025-06-27',
          data: () => ({
            photo: mockPhoto,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        },
      ];

      const mockSnapshot = { docs: mockDocs };
      mockCollection.get.mockResolvedValue(mockSnapshot);

      const result = await dayStorage.getPhotosForDateRange(startDate, endDate);

      expect(mockFirestore.collection).toHaveBeenCalledWith('days');
      expect(mockCollection.where).toHaveBeenCalledWith(
        '__name__',
        '>=',
        startDate
      );
      expect(mockCollection.where).toHaveBeenCalledWith(
        '__name__',
        '<=',
        endDate
      );
      expect(mockCollection.orderBy).toHaveBeenCalledWith('__name__', 'asc');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('2025-06-25');
      expect(result[1].id).toBe('2025-06-27');
    });

    it('should return empty array when no documents in range', async () => {
      const startDate = '2025-06-25';
      const endDate = '2025-06-27';

      const mockSnapshot = { docs: [] };
      mockCollection.get.mockResolvedValue(mockSnapshot);

      const result = await dayStorage.getPhotosForDateRange(startDate, endDate);

      expect(result).toEqual([]);
    });
  });

  describe('deleteDayRecord', () => {
    it('should delete a day record by date', async () => {
      const testDate = '2025-06-27';

      await dayStorage.deleteDayRecord(testDate);

      expect(mockFirestore.collection).toHaveBeenCalledWith('days');
      expect(mockCollection.doc).toHaveBeenCalledWith(testDate);
      expect(mockDoc.delete).toHaveBeenCalled();
    });
  });

  describe('getMostRecentPhoto', () => {
    it('should return most recent photo', async () => {
      const mockData = {
        date: '2025-06-27',
        photo: mockPhoto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockDocs = [
        {
          id: '2025-06-27',
          data: () => mockData,
        },
      ];

      const mockSnapshot = {
        empty: false,
        docs: mockDocs,
      };
      mockCollection.get.mockResolvedValue(mockSnapshot);

      const result = await dayStorage.getMostRecentPhoto();

      expect(mockFirestore.collection).toHaveBeenCalledWith('days');
      expect(mockCollection.orderBy).toHaveBeenCalledWith('__name__', 'desc');
      expect(mockCollection.limit).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        id: '2025-06-27',
        ...mockData,
      });
    });

    it('should return null when no photos exist', async () => {
      const mockSnapshot = {
        empty: true,
        docs: [],
      };
      mockCollection.get.mockResolvedValue(mockSnapshot);

      const result = await dayStorage.getMostRecentPhoto();

      expect(mockFirestore.collection).toHaveBeenCalledWith('days');
      expect(mockCollection.orderBy).toHaveBeenCalledWith('__name__', 'desc');
      expect(mockCollection.limit).toHaveBeenCalledWith(1);
      expect(result).toBeNull();
    });
  });

  describe('Date format validation', () => {
    it('should handle ISO date format correctly', async () => {
      const isoDate = '2025-06-27';

      await dayStorage.savePhotoForDate(isoDate, mockPhoto);

      expect(mockCollection.doc).toHaveBeenCalledWith(isoDate);
    });

    it('should work with different valid dates', async () => {
      const dates = ['2025-01-01', '2025-12-31', '2024-02-29']; // including leap year

      for (const date of dates) {
        await dayStorage.savePhotoForDate(date, mockPhoto);
        expect(mockCollection.doc).toHaveBeenCalledWith(date);
      }
    });
  });

  describe('Error handling', () => {
    it('should propagate Firestore errors', async () => {
      const testDate = '2025-06-27';
      const firestoreError = new Error('Firestore connection failed');

      mockDoc.set.mockRejectedValue(firestoreError);

      await expect(
        dayStorage.savePhotoForDate(testDate, mockPhoto)
      ).rejects.toThrow('Firestore connection failed');
    });

    it('should handle update errors gracefully', async () => {
      const testDate = '2025-06-27';
      const firestoreError = new Error('Document not found');

      mockDoc.update.mockRejectedValue(firestoreError);

      await expect(
        dayStorage.updatePhotoForDay(testDate, mockPhoto)
      ).rejects.toThrow('Document not found');
    });
  });

  describe('completePhotoForDay', () => {
    it('should update day record with complete photo and set status to completed', async () => {
      const testDate = '2025-06-28';
      const mockRandomPhoto = {
        id: 'test-id',
        urls: { full: 'test-url' },
        user: { name: 'Test User' },
        // Missing fields that will be added by completePhotoForDay
      } as any;

      mockDoc.update.mockResolvedValue(undefined);

      await dayStorage.completePhotoForDay(testDate, mockRandomPhoto);

      expect(mockCollection.doc).toHaveBeenCalledWith(testDate);
      expect(mockDoc.update).toHaveBeenCalledWith({
        photo: mockRandomPhoto,
        status: 'completed',
        updatedAt: expect.any(Date),
      });
    });

    it('should handle update errors', async () => {
      const testDate = '2025-06-28';
      const mockRandomPhoto = { id: 'test-id' } as any;
      const firestoreError = new Error('Update failed');

      mockDoc.update.mockRejectedValue(firestoreError);

      await expect(
        dayStorage.completePhotoForDay(testDate, mockRandomPhoto)
      ).rejects.toThrow('Update failed');
    });
  });

  describe('setDayRecordProcessing', () => {
    it('should update day record status to processing', async () => {
      const testDate = '2025-06-28';

      mockDoc.update.mockResolvedValue(undefined);

      await dayStorage.setDayRecordProcessing(testDate);

      expect(mockCollection.doc).toHaveBeenCalledWith(testDate);
      expect(mockDoc.update).toHaveBeenCalledWith({
        status: 'processing',
        updatedAt: expect.any(Date),
      });
    });

    it('should handle update errors', async () => {
      const testDate = '2025-06-28';
      const firestoreError = new Error('Update failed');

      mockDoc.update.mockRejectedValue(firestoreError);

      await expect(dayStorage.setDayRecordProcessing(testDate)).rejects.toThrow(
        'Update failed'
      );
    });
  });
});
