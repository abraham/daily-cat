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
      const mockConfigData = {
        apiUrl: 'https://api.example.com',
        maxRetries: 3,
        features: {
          enableNotifications: true,
          enableAnalytics: false,
        },
      };

      mockDoc.exists = true;
      mockDoc.data.mockReturnValue(mockConfigData);
      mockDoc.get.mockResolvedValue(mockDoc);

      const result = await configStorage.getConfig();

      expect(mockFirestore.collection).toHaveBeenCalledWith('config');
      expect(mockCollection.doc).toHaveBeenCalledWith('config');
      expect(mockDoc.get).toHaveBeenCalled();
      expect(result).toEqual(mockConfigData);
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
        lastPage: 'page-5',
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
});
