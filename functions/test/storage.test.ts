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
}));

describe('Storage Functions', () => {
  let storage: typeof import('../src/storage');

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Reset mock responses
    mockDoc.exists = false;
    mockDoc.data.mockReturnValue({});

    // Import fresh instance of storage module
    vi.resetModules();
    storage = await import('../src/storage');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('savePhotoForDate', () => {
    it('should save a photo for a specific date with completed status', async () => {
      const testDate = '2025-06-27';

      const result = await storage.savePhotoForDate(testDate, mockPhoto);

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

      await storage.savePhotoForDate(testDate, mockPhoto);

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

      const result = await storage.getPhotoForDate(testDate);

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

      const result = await storage.getPhotoForDate(testDate);

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

      const result = await storage.getPhotoForDate(testDate);

      expect(mockFirestore.collection).toHaveBeenCalledWith('days');
      expect(mockCollection.doc).toHaveBeenCalledWith(testDate);
      expect(mockDoc.get).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return null when document does not exist', async () => {
      const testDate = '2025-06-27';

      mockDoc.exists = false;
      mockDoc.get.mockResolvedValue(mockDoc);

      const result = await storage.getPhotoForDate(testDate);

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
      await storage.updatePhotoForDay(testDate, newPhoto);
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

      const result = await storage.getPhotosForDateRange(startDate, endDate);

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

      const result = await storage.getPhotosForDateRange(startDate, endDate);

      expect(result).toEqual([]);
    });
  });

  describe('deleteDayRecord', () => {
    it('should delete a day record by date', async () => {
      const testDate = '2025-06-27';

      await storage.deleteDayRecord(testDate);

      expect(mockFirestore.collection).toHaveBeenCalledWith('days');
      expect(mockCollection.doc).toHaveBeenCalledWith(testDate);
      expect(mockDoc.delete).toHaveBeenCalled();
    });
  });

  describe('hasPhotoForDate', () => {
    it('should return true when document exists', async () => {
      const testDate = '2025-06-27';

      mockDoc.exists = true;
      mockDoc.get.mockResolvedValue(mockDoc);

      const result = await storage.hasPhotoForDate(testDate);

      expect(mockFirestore.collection).toHaveBeenCalledWith('days');
      expect(mockCollection.doc).toHaveBeenCalledWith(testDate);
      expect(mockDoc.get).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when document does not exist', async () => {
      const testDate = '2025-06-27';

      mockDoc.exists = false;
      mockDoc.get.mockResolvedValue(mockDoc);

      const result = await storage.hasPhotoForDate(testDate);

      expect(mockFirestore.collection).toHaveBeenCalledWith('days');
      expect(mockCollection.doc).toHaveBeenCalledWith(testDate);
      expect(mockDoc.get).toHaveBeenCalled();
      expect(result).toBe(false);
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

      const result = await storage.getMostRecentPhoto();

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

      const result = await storage.getMostRecentPhoto();

      expect(mockFirestore.collection).toHaveBeenCalledWith('days');
      expect(mockCollection.orderBy).toHaveBeenCalledWith('__name__', 'desc');
      expect(mockCollection.limit).toHaveBeenCalledWith(1);
      expect(result).toBeNull();
    });
  });

  describe('Date format validation', () => {
    it('should handle ISO date format correctly', async () => {
      const isoDate = '2025-06-27';

      await storage.savePhotoForDate(isoDate, mockPhoto);

      expect(mockCollection.doc).toHaveBeenCalledWith(isoDate);
    });

    it('should work with different valid dates', async () => {
      const dates = ['2025-01-01', '2025-12-31', '2024-02-29']; // including leap year

      for (const date of dates) {
        await storage.savePhotoForDate(date, mockPhoto);
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
        storage.savePhotoForDate(testDate, mockPhoto)
      ).rejects.toThrow('Firestore connection failed');
    });

    it('should handle update errors gracefully', async () => {
      const testDate = '2025-06-27';
      const firestoreError = new Error('Document not found');

      mockDoc.update.mockRejectedValue(firestoreError);

      await expect(
        storage.updatePhotoForDay(testDate, mockPhoto)
      ).rejects.toThrow('Document not found');
    });
  });
});
