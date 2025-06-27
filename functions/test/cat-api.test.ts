import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock node-fetch at the module level
vi.mock('node-fetch', () => ({
  default: vi.fn(),
}));

describe('Cat API', () => {
  let fetchMock: any;
  let catApi: any;

  beforeEach(async () => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Get the mock reference
    fetchMock = (await import('node-fetch')).default;

    // Dynamically import the module to ensure mocks are applied
    catApi = await import('../src/cat-api');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('get function', () => {
    it('should fetch cat data from Unsplash API', async () => {
      const mockResponse = {
        id: 'test-id',
        urls: {
          full: 'https://images.unsplash.com/test-full',
        },
        links: {
          html: 'https://unsplash.com/photos/test-id',
        },
      };

      const mockFetchResponse = {
        json: () => Promise.resolve(mockResponse),
      };

      fetchMock.mockResolvedValue(mockFetchResponse);

      const result = await catApi.get({ clientId: 'test-client-id' });

      expect(fetchMock).toHaveBeenCalledOnce();
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.unsplash.com/photos/random?query=cat&client_id=test-client-id'
      );
      expect(result.id).toBe('test-id');
    });

    it('should construct correct URL with client ID', async () => {
      const mockFetchResponse = {
        json: () => Promise.resolve({}),
      };

      fetchMock.mockResolvedValue(mockFetchResponse);

      await catApi.get({ clientId: 'my-client-id-123' });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.unsplash.com/photos/random?query=cat&client_id=my-client-id-123'
      );
    });

    it('should handle API errors', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      await expect(catApi.get({ clientId: 'test-client-id' })).rejects.toThrow(
        'Network error'
      );
    });
  });
});
