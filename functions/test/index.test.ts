import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Load the actual photo.json fixture
const photoFixturePath = path.join(__dirname, 'fixtures', 'photo.json');
const mockApiResponse = JSON.parse(fs.readFileSync(photoFixturePath, 'utf8'));

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
      expect(html).toContain('class="cat-image"');
      expect(html).toContain(`src="${mockApiResponse.urls.full}"`);
      expect(html).toContain(`alt="${mockApiResponse.alt_description}"`);
    });

    it('should include user profile information in HTML', async () => {
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

      expect(html).toContain(
        `src="${mockApiResponse.user.profile_image.medium}"`
      );
      expect(html).toContain('alt="User profile"');
      expect(html).toContain(mockApiResponse.user.name);
      expect(html).toContain(`href="${mockApiResponse.user.links.html}"`);
      expect(html).toContain('class="user-username"');
      expect(html).toContain(`@${mockApiResponse.user.username}`);
    });

    it('should include likes count with heart emoji', async () => {
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

      expect(html).toContain('❤️');
      expect(html).toContain('589'); // The actual likes count from fixture
    });
    it('should include up to 5 tags with links', async () => {
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

      // Should include the first 5 tags from the fixture
      expect(html).toContain(
        '<a href="https://unsplash.com/s/photos/portrait" class="tag">portrait</a>'
      );
      expect(html).toContain(
        '<a href="https://unsplash.com/s/photos/cat" class="tag">cat</a>'
      );
      expect(html).toContain(
        '<a href="https://unsplash.com/s/photos/animal" class="tag">animal</a>'
      );
      expect(html).toContain(
        '<a href="https://unsplash.com/s/photos/dark" class="tag">dark</a>'
      );
      expect(html).toContain(
        '<a href="https://unsplash.com/s/photos/face" class="tag">face</a>'
      );

      // Should not include the 6th tag and beyond
      expect(html).not.toContain(
        '<a href="https://unsplash.com/s/photos/table" class="tag">table</a>'
      );
      expect(html).not.toContain(
        '<a href="https://unsplash.com/s/photos/hand" class="tag">hand</a>'
      );
    });

    it('should handle missing alt_description gracefully', async () => {
      // Override the mock to not include alt_description
      const mockWithoutAlt = { ...mockApiResponse, alt_description: undefined };
      catApiMock.get.mockResolvedValue(mockWithoutAlt);

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

      expect(html).toContain('alt="Cat photo"'); // Fallback alt text
    });

    it('should include responsive layout structure', async () => {
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

      expect(html).toContain('class="container"');
      expect(html).toContain('class="left-column"');
      expect(html).toContain('class="center-column"');
      expect(html).toContain('class="right-column"');
      expect(html).toContain('class="user-profile"');
      expect(html).toContain('class="user-row"');
      expect(html).toContain('class="right-section"');
      expect(html).toContain('@media (max-width: 768px)'); // Responsive CSS
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
