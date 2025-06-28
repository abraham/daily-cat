import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Load the actual photo.json fixture
const photoFixturePath = path.join(__dirname, 'fixtures', 'photo.json');
const mockApiResponse = JSON.parse(fs.readFileSync(photoFixturePath, 'utf8'));

// Mock Firebase Admin
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

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(() => mockApp),
  getApps: vi.fn(() => []),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => mockFirestore),
}));

// Mock the cat-api module
vi.mock('../src/cat-api', () => ({
  get: vi.fn(),
}));

// Mock the storage module
vi.mock('../src/storage', () => ({
  getPhotoForDate: vi.fn(),
  savePhotoForDate: vi.fn(),
}));

describe('Cat Function', () => {
  let catApiMock: any;
  let storageMock: any;
  let myFunctions: any;

  beforeEach(async () => {
    // Set up the API key environment variable for testing
    process.env.UNSPLASH_CLIENT_ID = 'test_client_id';

    // Reset all mocks
    vi.clearAllMocks();

    // Reset mock responses
    mockDoc.exists = false;
    mockDoc.data.mockReturnValue({});

    // Clear module cache first
    vi.resetModules();

    // Get the mocked modules after reset
    catApiMock = await import('../src/cat-api');
    storageMock = await import('../src/storage');

    catApiMock.get.mockResolvedValue(mockApiResponse);
    storageMock.getPhotoForDate.mockResolvedValue(null); // Default: no existing photo
    storageMock.savePhotoForDate.mockResolvedValue('2025-06-27');

    // Import the functions after mocks are set up
    myFunctions = await import('../src/index');
  });

  afterEach(() => {
    delete process.env.UNSPLASH_CLIENT_ID;
    vi.clearAllMocks();
  });

  describe('cat function', () => {
    it('should handle GET requests for root path', async () => {
      const req = { method: 'GET', url: '/' } as any;

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
      const req = { method: 'POST', url: '/' } as any;
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

      const req = { method: 'GET', url: '/' } as any;
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
      const req = { method: 'GET', url: '/' } as any;
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
      const req = { method: 'GET', url: '/' } as any;
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
      const req = { method: 'GET', url: '/' } as any;
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
      expect(html).toContain(
        `src="${mockApiResponse.urls.full.replace(/&/g, '&amp;')}"`
      );
      expect(html).toContain(
        `alt="${mockApiResponse.alt_description.replace(/'/g, '&#39;')}"`
      );
    });

    it('should include user profile information in HTML', async () => {
      const req = { method: 'GET', url: '/' } as any;
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
        `src="${mockApiResponse.user.profile_image.medium.replace(/&/g, '&amp;')}"`
      );
      expect(html).toContain('alt="User profile"');
      expect(html).toContain(mockApiResponse.user.name);
      expect(html).toContain(`href="${mockApiResponse.user.links.html}"`);
      expect(html).toContain('class="user-username"');
      expect(html).toContain(`@${mockApiResponse.user.username}`);
    });

    it('should include likes count with heart emoji', async () => {
      const req = { method: 'GET', url: '/' } as any;
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
      const req = { method: 'GET', url: '/' } as any;
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

      const req = { method: 'GET', url: '/' } as any;
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
      const req = { method: 'GET', url: '/' } as any;
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

      const req = { method: 'GET', url: '/' } as any;
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

    it('should handle valid date paths', async () => {
      const req = { method: 'GET', url: '/2025-06-27' } as any;

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
      expect(storageMock.getPhotoForDate).toHaveBeenCalledWith('2025-06-27');
      expect(storageMock.savePhotoForDate).toHaveBeenCalledWith(
        '2025-06-27',
        mockApiResponse
      );
      expect(sendCalled).toBe(true);
    });

    it('should return 404 for future dates', async () => {
      const req = { method: 'GET', url: '/2025-12-31' } as any;
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

      expect(statusCode).toBe(404);
      expect(message).toBe('Future dates are not available.');
      expect(catApiMock.get).not.toHaveBeenCalled();
    });

    it('should return 404 for invalid date format', async () => {
      const req = { method: 'GET', url: '/invalid-date' } as any;
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

      expect(statusCode).toBe(404);
      expect(message).toBe('Invalid date format. Use YYYY-MM-DD.');
      expect(catApiMock.get).not.toHaveBeenCalled();
    });

    it('should return 404 for invalid dates', async () => {
      const req = { method: 'GET', url: '/2025-02-30' } as any; // Invalid date (Feb 30th)
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

      expect(statusCode).toBe(404);
      expect(message).toBe('Invalid date.');
      expect(catApiMock.get).not.toHaveBeenCalled();
    });

    it('should handle past dates with no existing record', async () => {
      const req = { method: 'GET', url: '/2020-01-01' } as any;

      // Mock no existing photo for this date
      storageMock.getPhotoForDate.mockResolvedValue(null);

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

      expect(storageMock.getPhotoForDate).toHaveBeenCalledWith('2020-01-01');
      expect(catApiMock.get).toHaveBeenCalledOnce();
      expect(storageMock.savePhotoForDate).toHaveBeenCalledWith(
        '2020-01-01',
        mockApiResponse
      );
      expect(sendCalled).toBe(true);
    });

    it('should use existing photo for past dates with record', async () => {
      const req = { method: 'GET', url: '/2020-01-01' } as any;

      // Mock existing photo for this date
      const existingPhotoRecord = { photo: mockApiResponse };
      storageMock.getPhotoForDate.mockResolvedValue(existingPhotoRecord);

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

      expect(storageMock.getPhotoForDate).toHaveBeenCalledWith('2020-01-01');
      expect(catApiMock.get).not.toHaveBeenCalled(); // Should not fetch new photo
      expect(storageMock.savePhotoForDate).not.toHaveBeenCalled(); // Should not save
      expect(sendCalled).toBe(true);
    });

    it('should handle URLs with query parameters', async () => {
      const req = { method: 'GET', url: '/2025-06-27?utm_source=test' } as any;

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

      expect(storageMock.getPhotoForDate).toHaveBeenCalledWith('2025-06-27');
      expect(sendCalled).toBe(true);
    });

    it('should include navigation arrows with correct URLs for past dates', async () => {
      // Mock API response
      catApiMock.get.mockResolvedValue(mockApiResponse);
      storageMock.getPhotoForDate.mockResolvedValue(null);
      storageMock.savePhotoForDate.mockResolvedValue('2025-06-26');

      const req = {
        method: 'GET',
        url: '/2025-06-26',
      } as any;

      let htmlResponse = '';
      const res = {
        status: vi.fn(() => res),
        send: vi.fn((html) => {
          htmlResponse = html;
        }),
        set: vi.fn(),
      } as any;

      await myFunctions.cat(req, res);

      expect(htmlResponse).toContain('nav-arrow left');
      expect(htmlResponse).toContain('href="/2025-06-25"'); // Previous date
      expect(htmlResponse).toContain('nav-arrow right');
      expect(htmlResponse).toContain('href="/2025-06-27"'); // Next date
      expect(htmlResponse).toContain('class="nav-arrow right "'); // Right arrow should be visible (no hidden class)
    });

    it('should hide right navigation arrow for today', async () => {
      // Mock current date to be 2025-06-27
      const originalDate = Date;
      const mockDate = vi.fn(
        () => new originalDate('2025-06-27T12:00:00.000Z')
      );
      mockDate.prototype = originalDate.prototype;
      global.Date = mockDate as any;

      // Mock API response
      catApiMock.get.mockResolvedValue(mockApiResponse);
      storageMock.getPhotoForDate.mockResolvedValue(null);
      storageMock.savePhotoForDate.mockResolvedValue('2025-06-27');

      const req = {
        method: 'GET',
        url: '/2025-06-27',
      } as any;

      let htmlResponse = '';
      const res = {
        status: vi.fn(() => res),
        send: vi.fn((html) => {
          htmlResponse = html;
        }),
        set: vi.fn(),
      } as any;

      await myFunctions.cat(req, res);

      expect(htmlResponse).toContain('nav-arrow left');
      expect(htmlResponse).toContain('href="/2025-06-26"'); // Previous date
      expect(htmlResponse).toContain('nav-arrow right hidden'); // Right arrow should be hidden
      expect(htmlResponse).toContain('href="#"'); // Next date should be #

      // Restore original Date
      global.Date = originalDate;
    });

    it('should include navigation arrows for root path (today)', async () => {
      // Mock API response
      catApiMock.get.mockResolvedValue(mockApiResponse);
      storageMock.getPhotoForDate.mockResolvedValue(null);
      storageMock.savePhotoForDate.mockResolvedValue('2025-06-28');

      const req = {
        method: 'GET',
        url: '/',
      } as any;

      let htmlResponse = '';
      const res = {
        status: vi.fn(() => res),
        send: vi.fn((html) => {
          htmlResponse = html;
        }),
        set: vi.fn(),
      } as any;

      await myFunctions.cat(req, res);

      expect(htmlResponse).toContain('nav-arrow left');
      expect(htmlResponse).toContain('href="/2025-06-27"'); // Previous date (yesterday)
      expect(htmlResponse).toContain('nav-arrow right hidden'); // Right arrow should be hidden for today
    });

    it('should include clickable header that links to root path', async () => {
      // Mock API response
      catApiMock.get.mockResolvedValue(mockApiResponse);
      storageMock.getPhotoForDate.mockResolvedValue(null);
      storageMock.savePhotoForDate.mockResolvedValue('2025-06-28');

      const req = {
        method: 'GET',
        url: '/2025-06-25',
      } as any;

      let htmlResponse = '';
      const res = {
        status: vi.fn(() => res),
        send: vi.fn((html) => {
          htmlResponse = html;
        }),
        set: vi.fn(),
      } as any;

      await myFunctions.cat(req, res);

      // Should contain a link to root path within the header
      expect(htmlResponse).toContain('href="/"');
      expect(htmlResponse).toContain('Daily Cat');

      // Verify the header link structure (the header text should be wrapped in a link to "/")
      expect(htmlResponse).toMatch(/<a[^>]*href="\/"[^>]*>.*Daily Cat.*<\/a>/s);
    });
  });
});
