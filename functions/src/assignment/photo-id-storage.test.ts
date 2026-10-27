import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockDoc = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

const mockCollection = {
  doc: vi.fn(() => mockDoc),
  get: vi.fn(),
};

const mockFirestore = {
  collection: vi.fn(() => mockCollection),
};

vi.mock('../platform/firebase', () => ({
  getApp: vi.fn(() => ({})),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => mockFirestore),
}));

describe('Photo ID Storage Functions', () => {
  let photoIdStorage: typeof import('./photo-id-storage');

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    photoIdStorage = await import('./photo-id-storage.js');
  });

  describe('storePhotoId', () => {
    it('stores the photo ID as an empty document', async () => {
      mockDoc.set.mockResolvedValue(undefined);

      await photoIdStorage.storePhotoId('photo-1');

      expect(mockFirestore.collection).toHaveBeenCalledWith('photo-ids');
      expect(mockCollection.doc).toHaveBeenCalledWith('photo-1');
      expect(mockDoc.set).toHaveBeenCalledWith({});
    });

    it('propagates Firestore errors', async () => {
      mockDoc.set.mockRejectedValue(new Error('write failed'));

      await expect(photoIdStorage.storePhotoId('photo-1')).rejects.toThrow(
        'write failed'
      );
    });
  });

  describe('isPhotoIdUsed', () => {
    it('returns true when the document exists', async () => {
      mockDoc.get.mockResolvedValue({ exists: true });

      expect(await photoIdStorage.isPhotoIdUsed('photo-1')).toBe(true);
      expect(mockFirestore.collection).toHaveBeenCalledWith('photo-ids');
      expect(mockCollection.doc).toHaveBeenCalledWith('photo-1');
    });

    it('returns false when the document does not exist', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });

      expect(await photoIdStorage.isPhotoIdUsed('photo-2')).toBe(false);
    });
  });

  describe('getAllUsedPhotoIds', () => {
    it('returns the IDs of every document', async () => {
      mockCollection.get.mockResolvedValue({
        docs: [{ id: 'photo-1' }, { id: 'photo-2' }],
      });

      expect(await photoIdStorage.getAllUsedPhotoIds()).toEqual([
        'photo-1',
        'photo-2',
      ]);
      expect(mockFirestore.collection).toHaveBeenCalledWith('photo-ids');
    });

    it('returns an empty array when no photos are used', async () => {
      mockCollection.get.mockResolvedValue({ docs: [] });

      expect(await photoIdStorage.getAllUsedPhotoIds()).toEqual([]);
    });
  });

  describe('deletePhotoId', () => {
    it('deletes the photo ID document', async () => {
      mockDoc.delete.mockResolvedValue(undefined);

      await photoIdStorage.deletePhotoId('photo-1');

      expect(mockFirestore.collection).toHaveBeenCalledWith('photo-ids');
      expect(mockCollection.doc).toHaveBeenCalledWith('photo-1');
      expect(mockDoc.delete).toHaveBeenCalled();
    });
  });
});
