import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Cat API', () => {
  let fetchMock: any;
  let catApi: any;

  beforeEach(async () => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Mock global fetch
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    // Dynamically import the module to ensure mocks are applied
    catApi = await import('../src/cat-api');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('list function', () => {
    it('should fetch cat data from Unsplash API and return array of photos', async () => {
      const mockPhoto1 = {
        id: 'test-id-1',
        urls: {
          full: 'https://images.unsplash.com/test-full-1',
        },
        links: {
          html: 'https://unsplash.com/photos/test-id-1',
        },
      };

      const mockPhoto2 = {
        id: 'test-id-2',
        urls: {
          full: 'https://images.unsplash.com/test-full-2',
        },
        links: {
          html: 'https://unsplash.com/photos/test-id-2',
        },
      };

      const mockResponse = [mockPhoto1, mockPhoto2];

      const mockFetchResponse = {
        json: () => Promise.resolve(mockResponse),
      };

      fetchMock.mockResolvedValue(mockFetchResponse);

      const result = await catApi.list({ clientId: 'test-client-id' });

      expect(fetchMock).toHaveBeenCalledOnce();
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.unsplash.com/photos/random?query=cat&count=30',
        {
          headers: {
            Authorization: 'Client-ID test-client-id',
          },
        }
      );
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('test-id-1');
      expect(result[1].id).toBe('test-id-2');
    });

    it('should construct correct URL with client ID and count parameter', async () => {
      const mockFetchResponse = {
        json: () => Promise.resolve([]),
      };

      fetchMock.mockResolvedValue(mockFetchResponse);

      await catApi.list({ clientId: 'my-client-id-123' });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.unsplash.com/photos/random?query=cat&count=30',
        {
          headers: {
            Authorization: 'Client-ID my-client-id-123',
          },
        }
      );
    });

    it('should return empty array when API returns empty response', async () => {
      const mockFetchResponse = {
        json: () => Promise.resolve([]),
      };

      fetchMock.mockResolvedValue(mockFetchResponse);

      const result = await catApi.list({ clientId: 'test-client-id' });

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should handle API errors', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      await expect(catApi.list({ clientId: 'test-client-id' })).rejects.toThrow(
        'Network error'
      );
    });
  });
});
