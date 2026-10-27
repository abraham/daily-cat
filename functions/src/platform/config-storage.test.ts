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
};

const mockCollection = {
  doc: vi.fn(() => mockDoc),
  add: vi.fn(),
  where: vi.fn(() => mockCollection),
  orderBy: vi.fn(() => mockCollection),
  limit: vi.fn(() => mockCollection),
  get: vi.fn(),
};

const mockTransaction = {
  get: vi.fn(),
  update: vi.fn(),
};

const mockFirestore = {
  collection: vi.fn(() => mockCollection),
  runTransaction: vi.fn((updateFunction: (t: typeof mockTransaction) => any) =>
    updateFunction(mockTransaction)
  ),
};

const mockApp = {};

const validConfig = {
  minDate: '2025-01-01',
  importEnabled: true,
  lastPage: '5',
  importLimit: 10,
  processLimit: 5,
  processingMinDate: '2025-01-01',
};

// Mock Firebase Admin
vi.mock('./firebase', () => ({
  getApp: vi.fn(() => mockApp),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => mockFirestore),
  DocumentData: {},
  QueryDocumentSnapshot: {},
}));

describe('Config Storage Functions', () => {
  let configStorage: typeof import('./config-storage');

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

    // Import fresh instance of config storage module
    vi.resetModules();
    configStorage = await import('./config-storage.js');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getConfig', () => {
    it('should return config data when document exists', async () => {
      const mockConfigData = { ...validConfig };

      mockDoc.exists = true;
      mockDoc.data.mockReturnValue(mockConfigData);
      mockDoc.get.mockResolvedValue(mockDoc);

      const result = await configStorage.getConfig();

      expect(mockFirestore.collection).toHaveBeenCalledWith('config');
      expect(mockCollection.doc).toHaveBeenCalledWith('config');
      expect(mockDoc.get).toHaveBeenCalled();
      expect(result).toEqual(mockConfigData);
    });

    it('should throw when the document fails the schema', async () => {
      mockDoc.exists = true;
      mockDoc.data.mockReturnValue({ ...validConfig, lastPage: undefined });
      mockDoc.get.mockResolvedValue(mockDoc);

      await expect(configStorage.getConfig()).rejects.toThrow(
        'Invalid config/config: lastPage must be a positive integer string'
      );
    });

    it('should throw error when document does not exist', async () => {
      mockDoc.exists = false;
      mockDoc.get.mockResolvedValue(mockDoc);

      await expect(configStorage.getConfig()).rejects.toThrow(
        'Configuration document not found at config/config'
      );

      expect(mockFirestore.collection).toHaveBeenCalledWith('config');
      expect(mockCollection.doc).toHaveBeenCalledWith('config');
      expect(mockDoc.get).toHaveBeenCalled();
    });

    it('should handle firestore errors', async () => {
      const firestoreError = new Error('Network error');
      mockDoc.get.mockRejectedValue(firestoreError);

      await expect(configStorage.getConfig()).rejects.toThrow('Network error');

      expect(mockFirestore.collection).toHaveBeenCalledWith('config');
      expect(mockCollection.doc).toHaveBeenCalledWith('config');
      expect(mockDoc.get).toHaveBeenCalled();
    });
  });

  describe('updateConfig', () => {
    it('should update config document with partial data', async () => {
      const partialConfig = {
        minDate: '2025-01-01',
        importEnabled: true,
      };

      mockDoc.update.mockResolvedValue(undefined);

      await configStorage.updateConfig(partialConfig);

      expect(mockFirestore.collection).toHaveBeenCalledWith('config');
      expect(mockCollection.doc).toHaveBeenCalledWith('config');
      expect(mockDoc.update).toHaveBeenCalledWith(partialConfig);
    });

    it('should update config document with single field', async () => {
      const singleFieldUpdate = {
        importLimit: 5,
      };

      mockDoc.update.mockResolvedValue(undefined);

      await configStorage.updateConfig(singleFieldUpdate);

      expect(mockFirestore.collection).toHaveBeenCalledWith('config');
      expect(mockCollection.doc).toHaveBeenCalledWith('config');
      expect(mockDoc.update).toHaveBeenCalledWith(singleFieldUpdate);
    });

    it('should handle firestore update errors', async () => {
      const firestoreError = new Error('Update failed');
      mockDoc.update.mockRejectedValue(firestoreError);

      const updateData = { importEnabled: false };

      await expect(configStorage.updateConfig(updateData)).rejects.toThrow(
        'Update failed'
      );

      expect(mockFirestore.collection).toHaveBeenCalledWith('config');
      expect(mockCollection.doc).toHaveBeenCalledWith('config');
      expect(mockDoc.update).toHaveBeenCalledWith(updateData);
    });

    it('should handle empty update object', async () => {
      const emptyUpdate = {};

      mockDoc.update.mockResolvedValue(undefined);

      await configStorage.updateConfig(emptyUpdate);

      expect(mockFirestore.collection).toHaveBeenCalledWith('config');
      expect(mockCollection.doc).toHaveBeenCalledWith('config');
      expect(mockDoc.update).toHaveBeenCalledWith(emptyUpdate);
    });
  });

  describe('advanceLastPage', () => {
    it('should move lastPage past the fetched page inside a transaction', async () => {
      mockTransaction.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...validConfig, lastPage: '5' }),
      });

      const next = await configStorage.advanceLastPage('5');

      expect(next).toBe('6');
      expect(mockFirestore.runTransaction).toHaveBeenCalledOnce();
      expect(mockTransaction.get).toHaveBeenCalledWith(mockDoc);
      expect(mockTransaction.update).toHaveBeenCalledWith(mockDoc, {
        lastPage: '6',
      });
      expect(mockDoc.update).not.toHaveBeenCalled();
    });

    it('should never move lastPage backwards when another caller got further', async () => {
      mockTransaction.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...validConfig, lastPage: '9' }),
      });

      const next = await configStorage.advanceLastPage('5');

      expect(next).toBe('9');
      expect(mockTransaction.update).toHaveBeenCalledWith(mockDoc, {
        lastPage: '9',
      });
    });

    it('should throw when the config document is missing', async () => {
      mockTransaction.get.mockResolvedValue({ exists: false });

      await expect(configStorage.advanceLastPage('5')).rejects.toThrow(
        'Configuration document not found at config/config'
      );
      expect(mockTransaction.update).not.toHaveBeenCalled();
    });

    it('should not write NaN when the stored lastPage is invalid', async () => {
      mockTransaction.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...validConfig, lastPage: undefined }),
      });

      await expect(configStorage.advanceLastPage('5')).rejects.toThrow(
        'Invalid config/config'
      );
      expect(mockTransaction.update).not.toHaveBeenCalled();
    });
  });
});
