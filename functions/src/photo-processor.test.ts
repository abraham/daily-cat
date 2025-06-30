import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { UnsplashPhoto, UnsplashRandomPhoto } from './types';

// Load fixtures for testing
const photoFixturePath = path.join(__dirname, 'fixtures', 'photo.json');
const randomFixturePath = path.join(__dirname, 'fixtures', 'random.json');
const mockCompletePhoto: UnsplashPhoto = JSON.parse(
  fs.readFileSync(photoFixturePath, 'utf8')
);
const mockRandomPhotos: UnsplashRandomPhoto[] = JSON.parse(
  fs.readFileSync(randomFixturePath, 'utf8')
);

// Mock Firebase Functions logger
vi.mock('firebase-functions/logger', () => ({
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

// Mock Firebase Functions params
const mockSecret = {
  value: vi.fn(() => 'test-client-id'),
};

vi.mock('firebase-functions/params', () => ({
  defineSecret: vi.fn(() => mockSecret),
}));

// Mock day storage module
const mockDayStorage = {
  completePhotoForDay: vi.fn(),
};

vi.mock('../src/storage/day-storage', () => mockDayStorage);

// Mock photo ID storage module
const mockPhotoIdStorage = {
  isPhotoIdUsed: vi.fn(),
};

vi.mock('../src/storage/photo-id-storage', () => mockPhotoIdStorage);

// Mock cat-api module
const mockCatApi = {
  list: vi.fn(),
  get: vi.fn(),
};

vi.mock('../src/cat-api', () => mockCatApi);

describe('Photo Processor', () => {
  let photoProcessor: any;

  beforeEach(async () => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Reset mock implementations
    mockPhotoIdStorage.isPhotoIdUsed.mockResolvedValue(false);
    mockDayStorage.completePhotoForDay.mockResolvedValue(undefined);
    mockCatApi.list.mockResolvedValue(mockRandomPhotos);
    mockCatApi.get.mockResolvedValue(mockCompletePhoto);

    // Dynamically import the module to ensure mocks are applied
    photoProcessor = await import('./photo-processor.js');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('processPhotoForDay', () => {
    it('should successfully process a photo for a day', async () => {
      const dayId = '2025-06-28';

      const result = await photoProcessor.processPhotoForDay(dayId, 1);

      expect(result).toBe(true);
      expect(mockCatApi.list).toHaveBeenCalledWith({
        clientId: 'test-client-id',
      });
      expect(mockPhotoIdStorage.isPhotoIdUsed).toHaveBeenCalledWith(
        mockRandomPhotos[0].id
      );
      expect(mockCatApi.get).toHaveBeenCalledWith(
        { clientId: 'test-client-id' },
        mockRandomPhotos[0].id
      );
      expect(mockDayStorage.completePhotoForDay).toHaveBeenCalledWith(
        dayId,
        mockCompletePhoto
      );
    });

    it('should skip used photos and select the first unused one', async () => {
      const dayId = '2025-06-28';

      // Mock first photo as used, second as unused
      mockPhotoIdStorage.isPhotoIdUsed
        .mockResolvedValueOnce(true) // First photo is used
        .mockResolvedValueOnce(false); // Second photo is unused

      const result = await photoProcessor.processPhotoForDay(dayId, 1);

      expect(result).toBe(true);
      expect(mockPhotoIdStorage.isPhotoIdUsed).toHaveBeenCalledTimes(2);
      expect(mockPhotoIdStorage.isPhotoIdUsed).toHaveBeenNthCalledWith(
        1,
        mockRandomPhotos[0].id
      );
      expect(mockPhotoIdStorage.isPhotoIdUsed).toHaveBeenNthCalledWith(
        2,
        mockRandomPhotos[1].id
      );
      expect(mockCatApi.get).toHaveBeenCalledWith(
        { clientId: 'test-client-id' },
        mockRandomPhotos[1].id
      );
    });

    it('should continue to next photo if get photo details fails', async () => {
      const dayId = '2025-06-28';

      // Mock first photo get to fail, second to succeed
      mockCatApi.get
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce(mockCompletePhoto);

      const result = await photoProcessor.processPhotoForDay(dayId, 1);

      expect(result).toBe(true);
      expect(mockCatApi.get).toHaveBeenCalledTimes(2);
      expect(mockCatApi.get).toHaveBeenNthCalledWith(
        1,
        { clientId: 'test-client-id' },
        mockRandomPhotos[0].id
      );
      expect(mockCatApi.get).toHaveBeenNthCalledWith(
        2,
        { clientId: 'test-client-id' },
        mockRandomPhotos[1].id
      );
      expect(mockDayStorage.completePhotoForDay).toHaveBeenCalledWith(
        dayId,
        mockCompletePhoto
      );
    });

    it('should retry when all photos are used', async () => {
      const dayId = '2025-06-28';

      // Mock all photos as used on first attempt, first photo unused on second attempt
      let callCount = 0;
      mockPhotoIdStorage.isPhotoIdUsed.mockImplementation(() => {
        callCount++;
        // First 30 calls (first attempt) return true (all used)
        // 31st call (second attempt, first photo) returns false (unused)
        return Promise.resolve(callCount <= 30);
      });

      // Mock setTimeout to resolve immediately for faster tests
      vi.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });

      const result = await photoProcessor.processPhotoForDay(dayId, 2);

      expect(result).toBe(true);
      expect(mockCatApi.list).toHaveBeenCalledTimes(2);
      expect(mockDayStorage.completePhotoForDay).toHaveBeenCalledWith(
        dayId,
        mockCompletePhoto
      );

      vi.restoreAllMocks();
    });

    it('should fail after max retries when no unused photos found', async () => {
      const dayId = '2025-06-28';

      // Mock all photos as used
      mockPhotoIdStorage.isPhotoIdUsed.mockResolvedValue(true);

      // Mock setTimeout to resolve immediately for faster tests
      vi.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });

      const result = await photoProcessor.processPhotoForDay(dayId, 2);

      expect(result).toBe(false);
      expect(mockCatApi.list).toHaveBeenCalledTimes(2);
      expect(mockDayStorage.completePhotoForDay).not.toHaveBeenCalled();

      vi.restoreAllMocks();
    });

    it('should handle API errors and retry', async () => {
      const dayId = '2025-06-28';

      // Mock API to fail on first attempt, succeed on second
      mockCatApi.list
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce(mockRandomPhotos);

      // Mock setTimeout to resolve immediately for faster tests
      vi.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });

      const result = await photoProcessor.processPhotoForDay(dayId, 2);

      expect(result).toBe(true);
      expect(mockCatApi.list).toHaveBeenCalledTimes(2);
      expect(mockDayStorage.completePhotoForDay).toHaveBeenCalledWith(
        dayId,
        mockCompletePhoto
      );

      vi.restoreAllMocks();
    });

    it('should fail after max retries when API consistently fails', async () => {
      const dayId = '2025-06-28';

      // Mock API to always fail
      mockCatApi.list.mockRejectedValue(new Error('Persistent API Error'));

      // Mock setTimeout to resolve immediately for faster tests
      vi.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });

      const result = await photoProcessor.processPhotoForDay(dayId, 2);

      expect(result).toBe(false);
      expect(mockCatApi.list).toHaveBeenCalledTimes(2);
      expect(mockDayStorage.completePhotoForDay).not.toHaveBeenCalled();

      vi.restoreAllMocks();
    });

    it('should use exponential backoff for delays', async () => {
      const dayId = '2025-06-28';

      // Mock all photos as used to trigger retries
      mockPhotoIdStorage.isPhotoIdUsed.mockResolvedValue(true);

      // Mock setTimeout to capture delay values
      const setTimeoutSpy = vi
        .spyOn(global, 'setTimeout')
        .mockImplementation((callback: any) => {
          callback();
          return {} as any;
        });

      await photoProcessor.processPhotoForDay(dayId, 3);

      // Check that setTimeout was called with increasing delays (exponential backoff)
      expect(setTimeoutSpy).toHaveBeenCalledTimes(2); // 2 delays for 3 attempts
      expect(setTimeoutSpy).toHaveBeenNthCalledWith(
        1,
        expect.any(Function),
        1000
      ); // First delay: 1s
      expect(setTimeoutSpy).toHaveBeenNthCalledWith(
        2,
        expect.any(Function),
        2000
      ); // Second delay: 2s

      vi.restoreAllMocks();
    });

    it('should cap delay at maximum value', async () => {
      const dayId = '2025-06-28';

      // Mock all photos as used to trigger retries
      mockPhotoIdStorage.isPhotoIdUsed.mockResolvedValue(true);

      // Mock setTimeout to capture delay values
      const setTimeoutSpy = vi
        .spyOn(global, 'setTimeout')
        .mockImplementation((callback: any) => {
          callback();
          return {} as any;
        });

      await photoProcessor.processPhotoForDay(dayId, 6);

      // Check that delay is capped at 10000ms (10s)
      const calls = setTimeoutSpy.mock.calls;
      const lastDelay = calls[calls.length - 1][1];
      expect(lastDelay).toBeLessThanOrEqual(10000);

      vi.restoreAllMocks();
    });
  });

  describe('unsplashClientId export', () => {
    it('should export the unsplashClientId secret', () => {
      expect(photoProcessor.unsplashClientId).toBeDefined();
      expect(photoProcessor.unsplashClientId).toBe(mockSecret);
    });
  });
});
