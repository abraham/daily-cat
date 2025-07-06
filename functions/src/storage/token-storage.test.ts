import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getTokenDocument,
  saveTokenDocument,
  deleteTokenDocument,
} from './token-storage';
import { Token } from '../types/token';
import { Timestamp } from 'firebase-admin/firestore';

// Mock Firebase Admin
vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
}));

let mockDoc: any;

vi.mock('firebase-admin/firestore', async () => {
  const actual = await vi.importActual('firebase-admin/firestore');
  return {
    Timestamp: actual.Timestamp,
    getFirestore: vi.fn(() => ({
      collection: vi.fn(() => ({
        doc: vi.fn(() => mockDoc),
      })),
    })),
  };
});

describe('token storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockDoc = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    };
  });

  describe('getTokenDocument', () => {
    it('should return token document when it exists', async () => {
      const tokenData = {
        token: 'test-token',
        timestamp: Date.now(),
        topics: ['hour-12'],
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => tokenData,
      });

      const result = await getTokenDocument('test-token');

      expect(result).toEqual(tokenData);
      expect(mockDoc.get).toHaveBeenCalledTimes(1);
    });

    it('should return null when token document does not exist', async () => {
      mockDoc.get.mockResolvedValue({
        exists: false,
      });

      const result = await getTokenDocument('test-token');

      expect(result).toBeNull();
      expect(mockDoc.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('saveTokenDocument', () => {
    it('should save token document', async () => {
      const tokenData: Token = {
        token: 'test-token',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        topics: ['hour-12'],
      };

      mockDoc.set.mockResolvedValue(undefined);

      await saveTokenDocument('test-token', tokenData);

      expect(mockDoc.set).toHaveBeenCalledWith(tokenData);
      expect(mockDoc.set).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteTokenDocument', () => {
    it('should delete token document', async () => {
      mockDoc.delete.mockResolvedValue(undefined);

      await deleteTokenDocument('test-token');

      expect(mockDoc.delete).toHaveBeenCalledTimes(1);
    });
  });
});
