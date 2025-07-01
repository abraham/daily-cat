import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Firestore
const mockDoc = {
  id: '',
  exists: false,
  data: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  ref: {},
};

const mockBatch = {
  set: vi.fn(),
  delete: vi.fn(),
  commit: vi.fn(),
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
  batch: vi.fn(() => mockBatch),
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

describe('Available Photo IDs Storage Functions', () => {
  let availablePhotoIdsStorage: typeof import('./available-photo-ids-storage');

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Reset mock responses
    mockDoc.exists = false;
    mockDoc.data.mockReturnValue({});
    mockDoc.get.mockResolvedValue(mockDoc);
    mockDoc.set.mockResolvedValue(undefined);
    mockDoc.delete.mockResolvedValue(undefined);

    mockBatch.set.mockReturnValue(mockBatch);
    mockBatch.delete.mockReturnValue(mockBatch);
    mockBatch.commit.mockResolvedValue(undefined);

    // Reset collection mock to return mockDoc by default
    mockCollection.doc.mockReturnValue(mockDoc);
    mockCollection.get.mockResolvedValue({ docs: [] });

    // Import fresh instance of available photo IDs storage module
    vi.resetModules();
    availablePhotoIdsStorage = await import('./available-photo-ids-storage.js');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('storeAvailablePhotoId', () => {
    it('should store a photo ID with empty object', async () => {
      const photoId = 'test-photo-123';

      await availablePhotoIdsStorage.storeAvailablePhotoId(photoId);

      expect(mockFirestore.collection).toHaveBeenCalledWith(
        'available-photo-ids'
      );
      expect(mockCollection.doc).toHaveBeenCalledWith(photoId);
      expect(mockDoc.set).toHaveBeenCalledWith({});
    });
  });

  describe('getNextAvailablePhotoIds', () => {
    it('should return array of up to 10 available photo IDs', async () => {
      const mockDocs = [
        { id: 'photo-1' },
        { id: 'photo-2' },
        { id: 'photo-3' },
      ];

      const mockLimitedCollection = {
        ...mockCollection,
        get: vi.fn().mockResolvedValue({ docs: mockDocs }),
      };

      mockCollection.limit = vi.fn(() => mockLimitedCollection);

      const result = await availablePhotoIdsStorage.getNextAvailablePhotoIds();

      expect(mockFirestore.collection).toHaveBeenCalledWith(
        'available-photo-ids'
      );
      expect(mockCollection.limit).toHaveBeenCalledWith(10);
      expect(mockLimitedCollection.get).toHaveBeenCalled();
      expect(result).toEqual(['photo-1', 'photo-2', 'photo-3']);
    });

    it('should return empty array when no photo IDs exist', async () => {
      const mockLimitedCollection = {
        ...mockCollection,
        get: vi.fn().mockResolvedValue({ docs: [] }),
      };

      mockCollection.limit = vi.fn(() => mockLimitedCollection);

      const result = await availablePhotoIdsStorage.getNextAvailablePhotoIds();

      expect(mockFirestore.collection).toHaveBeenCalledWith(
        'available-photo-ids'
      );
      expect(mockCollection.limit).toHaveBeenCalledWith(10);
      expect(mockLimitedCollection.get).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('removeAvailablePhotoId', () => {
    it('should delete a photo ID from the collection', async () => {
      const photoId = 'test-photo-123';

      await availablePhotoIdsStorage.removeAvailablePhotoId(photoId);

      expect(mockFirestore.collection).toHaveBeenCalledWith(
        'available-photo-ids'
      );
      expect(mockCollection.doc).toHaveBeenCalledWith(photoId);
      expect(mockDoc.delete).toHaveBeenCalled();
    });
  });

  describe('storeMultipleAvailablePhotoIds', () => {
    it('should store multiple photo IDs using batch operation', async () => {
      const photoIds = ['photo-1', 'photo-2', 'photo-3'];

      await availablePhotoIdsStorage.storeMultipleAvailablePhotoIds(photoIds);

      expect(mockFirestore.batch).toHaveBeenCalled();
      expect(mockBatch.set).toHaveBeenCalledTimes(3);
      expect(mockBatch.commit).toHaveBeenCalled();

      // Verify each photo ID was added to the batch
      photoIds.forEach((photoId) => {
        expect(mockCollection.doc).toHaveBeenCalledWith(photoId);
      });
    });

    it('should handle empty array', async () => {
      const photoIds: string[] = [];

      await availablePhotoIdsStorage.storeMultipleAvailablePhotoIds(photoIds);

      expect(mockFirestore.batch).toHaveBeenCalled();
      expect(mockBatch.set).not.toHaveBeenCalled();
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });
});
