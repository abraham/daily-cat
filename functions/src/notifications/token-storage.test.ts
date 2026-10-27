import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getTokenDocument,
  saveTokenDocument,
  deleteTokenDocument,
  getTokensUpdatedBefore,
  touchTokenDocuments,
  deleteTokenDocuments,
} from './token-storage';
import { Token } from './token';
import { Timestamp } from 'firebase-admin/firestore';

// Mock Firebase Admin
vi.mock('../platform/firebase', () => ({
  getApp: vi.fn(),
}));

let mockDoc: any;
let mockQuery: any;
let mockBatch: any;
const mockCollectionDoc = vi.fn((id: string) => ({ id, ...mockDoc }));

vi.mock('firebase-admin/firestore', async () => {
  const actual = await vi.importActual('firebase-admin/firestore');
  return {
    Timestamp: actual.Timestamp,
    getFirestore: vi.fn(() => ({
      collection: vi.fn(() => ({
        doc: mockCollectionDoc,
        where: (...args: unknown[]) => mockQuery.where(...args),
      })),
      batch: () => mockBatch,
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
    mockQuery = {
      where: vi.fn(() => mockQuery),
      orderBy: vi.fn(() => mockQuery),
      limit: vi.fn(() => mockQuery),
      get: vi.fn(),
    };
    mockBatch = {
      update: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
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

  describe('getTokensUpdatedBefore', () => {
    it('should query the oldest tokens updated before the cutoff', async () => {
      const cutoff = Timestamp.fromDate(new Date('2025-01-01T00:00:00Z'));
      const token = { token: 'old-token', topics: ['hour-12'] };
      mockQuery.get.mockResolvedValue({ docs: [{ data: () => token }] });

      const result = await getTokensUpdatedBefore(cutoff, 500);

      expect(mockQuery.where).toHaveBeenCalledWith('updatedAt', '<', cutoff);
      expect(mockQuery.orderBy).toHaveBeenCalledWith('updatedAt', 'asc');
      expect(mockQuery.limit).toHaveBeenCalledWith(500);
      expect(result).toEqual([token]);
    });
  });

  describe('touchTokenDocuments', () => {
    it('should set updatedAt on every token in one batch', async () => {
      await touchTokenDocuments(['a-token', 'b-token']);

      expect(mockBatch.update).toHaveBeenCalledTimes(2);
      expect(mockBatch.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'a-token' }),
        { updatedAt: expect.any(Timestamp) }
      );
      expect(mockBatch.commit).toHaveBeenCalledOnce();
    });

    it('should not commit an empty batch', async () => {
      await touchTokenDocuments([]);

      expect(mockBatch.commit).not.toHaveBeenCalled();
    });
  });

  describe('deleteTokenDocuments', () => {
    it('should delete every token in one batch', async () => {
      await deleteTokenDocuments(['a-token', 'b-token']);

      expect(mockBatch.delete).toHaveBeenCalledTimes(2);
      expect(mockBatch.delete).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'b-token' })
      );
      expect(mockBatch.commit).toHaveBeenCalledOnce();
    });

    it('should not commit an empty batch', async () => {
      await deleteTokenDocuments([]);

      expect(mockBatch.commit).not.toHaveBeenCalled();
    });
  });
});
