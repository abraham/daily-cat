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
    catApi = await import('./cat-api.js');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('list function', () => {
    it('should fetch cat data from Unsplash search API and return search response', async () => {
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

      const mockSearchResponse = {
        total: 2,
        total_pages: 1,
        results: [mockPhoto1, mockPhoto2],
      };

      const mockFetchResponse = {
        ok: true,
        json: () => Promise.resolve(mockSearchResponse),
      };

      fetchMock.mockResolvedValue(mockFetchResponse);

      const result = await catApi.list({
        clientId: 'test-client-id',
        page: '1',
      });

      expect(fetchMock).toHaveBeenCalledOnce();
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.unsplash.com/search/photos?query=cat&per_page=30&order_by=relevant&page=1',
        {
          headers: {
            Authorization: 'Client-ID test-client-id',
          },
        }
      );
      expect(result).toEqual(mockSearchResponse);
      expect(result.total).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].id).toBe('test-id-1');
      expect(result.results[1].id).toBe('test-id-2');
    });

    it('should construct correct URL with client ID and page parameter', async () => {
      const mockSearchResponse = {
        total: 0,
        total_pages: 0,
        results: [],
      };

      const mockFetchResponse = {
        ok: true,
        json: () => Promise.resolve(mockSearchResponse),
      };

      fetchMock.mockResolvedValue(mockFetchResponse);

      await catApi.list({ clientId: 'my-client-id-123', page: '2' });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.unsplash.com/search/photos?query=cat&per_page=30&order_by=relevant&page=2',
        {
          headers: {
            Authorization: 'Client-ID my-client-id-123',
          },
        }
      );
    });

    it('should return empty results when API returns empty search response', async () => {
      const mockSearchResponse = {
        total: 0,
        total_pages: 0,
        results: [],
      };

      const mockFetchResponse = {
        ok: true,
        json: () => Promise.resolve(mockSearchResponse),
      };

      fetchMock.mockResolvedValue(mockFetchResponse);

      const result = await catApi.list({
        clientId: 'test-client-id',
        page: '1',
      });

      expect(result).toEqual(mockSearchResponse);
      expect(result.total).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it('should handle API errors', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      await expect(
        catApi.list({ clientId: 'test-client-id', page: '1' })
      ).rejects.toThrow('Network error');
    });

    it('should handle API response errors', async () => {
      const mockFetchResponse = {
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      };

      fetchMock.mockResolvedValue(mockFetchResponse);

      await expect(
        catApi.list({ clientId: 'invalid-client-id', page: '1' })
      ).rejects.toThrow('Failed to fetch photos: 403 Forbidden');
    });
  });

  describe('get function', () => {
    it('should fetch a specific photo by ID from Unsplash API', async () => {
      const mockPhoto = {
        id: 'test-photo-id',
        urls: {
          full: 'https://images.unsplash.com/test-full',
        },
        links: {
          html: 'https://unsplash.com/photos/test-photo-id',
        },
        user: {
          name: 'Test Photographer',
          username: 'testuser',
        },
        meta: {
          index: true,
        },
        public_domain: false,
        tags: [],
        topics: [],
      };

      const mockFetchResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockPhoto),
      };

      fetchMock.mockResolvedValue(mockFetchResponse);

      const result = await catApi.get(
        { clientId: 'test-client-id' },
        'test-photo-id'
      );

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.unsplash.com/photos/test-photo-id',
        {
          headers: {
            Authorization: 'Client-ID test-client-id',
          },
        }
      );
      expect(result).toEqual(mockPhoto);
    });

    it('should throw error when photo is not found (404)', async () => {
      const mockFetchResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ error: 'Photo not found' }),
      };

      fetchMock.mockResolvedValue(mockFetchResponse);

      await expect(
        catApi.get({ clientId: 'test-client-id' }, 'non-existent-id')
      ).rejects.toThrow('Failed to fetch photo non-existent-id: 404 Not Found');
    });

    it('should throw error when rate limited (429)', async () => {
      const mockFetchResponse = {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: () => Promise.resolve({ error: 'Rate limit exceeded' }),
      };

      fetchMock.mockResolvedValue(mockFetchResponse);

      await expect(
        catApi.get({ clientId: 'test-client-id' }, 'test-photo-id')
      ).rejects.toThrow(
        'Failed to fetch photo test-photo-id: 429 Too Many Requests'
      );
    });

    it('should throw error when unauthorized (401)', async () => {
      const mockFetchResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: 'Invalid client ID' }),
      };

      fetchMock.mockResolvedValue(mockFetchResponse);

      await expect(
        catApi.get({ clientId: 'invalid-client-id' }, 'test-photo-id')
      ).rejects.toThrow(
        'Failed to fetch photo test-photo-id: 401 Unauthorized'
      );
    });

    it('should handle network errors', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      await expect(
        catApi.get({ clientId: 'test-client-id' }, 'test-photo-id')
      ).rejects.toThrow('Network error');
    });
  });
});
