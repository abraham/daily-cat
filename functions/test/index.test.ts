import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock API response for testing
const mockApiResponse = {
  id: 'jfQCT6XifkY',
  urls: {
    full: 'https://images.unsplash.com/photo-1468206449511-1af1a5c267ab?ixlib=rb-0.3.5&q=85&fm=jpg&crop=entropy&cs=srgb&s=7bb4c5cb67a099da47b4827552731b16',
  },
  links: {
    html: 'http://unsplash.com/photos/jfQCT6XifkY',
  },
};

// Mock the cat-api module
vi.mock('../src/cat-api', () => ({
  get: vi.fn(),
}));

describe('Cat Function', () => {
  let catApiMock: any;
  let myFunctions: any;

  beforeEach(async () => {
    // Set up the API key environment variable for testing
    process.env.UNSPLASH_CLIENT_ID = 'test_client_id';

    // Get the mocked cat-api
    catApiMock = await import('../src/cat-api');
    catApiMock.get.mockResolvedValue(mockApiResponse);

    // Clear module cache and re-import to get fresh instance
    vi.resetModules();
    myFunctions = await import('../src/index');
  });

  afterEach(() => {
    delete process.env.UNSPLASH_CLIENT_ID;
    vi.clearAllMocks();
  });

  describe('cat function', () => {
    it('should handle GET requests', async () => {
      const req = { method: 'GET' } as any;

      let sendCalled = false;
      const res = {
        send: () => {
          sendCalled = true;
        },
        set: () => res,
        status: () => res,
      } as any;

      await new Promise<void>((resolve) => {
        res.send = () => {
          sendCalled = true;
          resolve();
        };
        myFunctions.cat(req, res);
      });

      expect(catApiMock.get).toHaveBeenCalledOnce();
      expect(sendCalled).toBe(true);
    });

    it('should return 403 for non-GET requests', async () => {
      const req = { method: 'POST' } as any;
      let statusCode: number = 0;
      let message: string = '';

      const res = {
        send: (msg: string) => {
          message = msg;
        },
        set: () => res,
        status: (code: number) => {
          statusCode = code;
          return res;
        },
      } as any;

      await new Promise<void>((resolve) => {
        res.send = (msg: string) => {
          message = msg;
          resolve();
        };
        myFunctions.cat(req, res);
      });

      expect(statusCode).toBe(403);
      expect(message).toBe('Forbidden!');
    });

    it('should return 500 when API key is not configured', async () => {
      // Reset the environment variable for this test
      delete process.env.UNSPLASH_CLIENT_ID;

      // Re-import the module without API key
      vi.resetModules();
      const myFunctionsNoKey = await import('../src/index');

      const req = { method: 'GET' } as any;
      let statusCode: number = 0;
      let message: string = '';

      const res = {
        send: (msg: string) => {
          message = msg;
        },
        set: () => res,
        status: (code: number) => {
          statusCode = code;
          return res;
        },
      } as any;

      await new Promise<void>((resolve) => {
        res.send = (msg: string) => {
          message = msg;
          resolve();
        };
        myFunctionsNoKey.cat(req, res);
      });

      expect(statusCode).toBe(500);
      expect(message).toBe('API key not configured');
    });

    it('should set caching headers', async () => {
      const req = { method: 'GET' } as any;
      let cacheKey: string = '';
      let cacheValue: string = '';

      const res = {
        send: () => {},
        set: (key: string, value: string) => {
          cacheKey = key;
          cacheValue = value;
        },
        status: () => res,
      } as any;

      await new Promise<void>((resolve) => {
        res.set = (key: string, value: string) => {
          cacheKey = key;
          cacheValue = value;
          resolve();
        };
        myFunctions.cat(req, res);
      });

      expect(cacheKey).toBe('Cache-Control');
      expect(cacheValue).toBe('public, max-age=1, s-maxage=1');
    });

    it('should render valid HTML', async () => {
      const req = { method: 'GET' } as any;
      let html: string = '';

      const res = {
        send: (htmlContent: string) => {
          html = htmlContent;
        },
        set: () => res,
        status: () => res,
      } as any;

      await new Promise<void>((resolve) => {
        res.send = (htmlContent: string) => {
          html = htmlContent;
          resolve();
        };
        myFunctions.cat(req, res);
      });

      expect(html).toContain('<!doctype html>');
      expect(html).toContain('<head>');
      expect(html).toContain('</head>');
      expect(html).toContain('<body>');
      expect(html).toContain('</body>');
      expect(html).toContain('</html>');
      expect(html).toContain('<title>Daily Cat</title>');
    });

    it('should include cat image and link in HTML', async () => {
      const req = { method: 'GET' } as any;
      let html: string = '';

      const res = {
        send: (htmlContent: string) => {
          html = htmlContent;
        },
        set: () => res,
        status: () => res,
      } as any;

      await new Promise<void>((resolve) => {
        res.send = (htmlContent: string) => {
          html = htmlContent;
          resolve();
        };
        myFunctions.cat(req, res);
      });

      expect(html).toContain(`<a href="${mockApiResponse.links.html}">`);
      expect(html).toContain(`<img src="${mockApiResponse.urls.full}" />`);
    });

    it('should handle API errors gracefully', async () => {
      // Override the mock to reject for this test
      catApiMock.get.mockRejectedValue(new Error('API Error'));

      const req = { method: 'GET' } as any;
      let statusCode: number = 0;
      let message: string = '';

      const res = {
        send: (msg: string) => {
          message = msg;
        },
        set: () => res,
        status: (code: number) => {
          statusCode = code;
          return res;
        },
      } as any;

      await new Promise<void>((resolve) => {
        res.send = (msg: string) => {
          message = msg;
          resolve();
        };
        myFunctions.cat(req, res);
      });

      expect(statusCode).toBe(500);
      expect(message).toBe('Error fetching cat image');
    });
  });
});
