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

// Mock the storage module
vi.mock('../src/storage', () => ({
  getPhotoForDate: vi.fn(),
  createNewDayRecord: vi.fn(),
}));

// Mock the template module
vi.mock('../src/template', () => ({
  renderPhotoPage: vi.fn(),
  renderProcessingPage: vi.fn(),
}));

// Mock lit-html SSR
vi.mock('@lit-labs/ssr', () => ({
  render: vi.fn().mockReturnValue(['mocked html']),
}));

describe('Cat Function', () => {
  let storageMock: any;
  let templateMock: any;
  let myFunctions: any;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Reset mock responses
    mockDoc.exists = false;
    mockDoc.data.mockReturnValue({});

    // Clear module cache first
    vi.resetModules();

    // Get the mocked modules after reset
    storageMock = await import('../src/storage');
    templateMock = await import('../src/template');

    storageMock.getPhotoForDate.mockResolvedValue(null); // Default: no existing photo
    storageMock.createNewDayRecord.mockResolvedValue({
      id: 'test-date',
      status: 'created',
      photo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    templateMock.renderPhotoPage.mockReturnValue('mocked photo page html');
    templateMock.renderProcessingPage.mockReturnValue(
      'mocked processing page html'
    );

    // Import the functions after mocks are set up
    myFunctions = await import('../src/index');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('cat function', () => {
    it('should handle GET requests for root path with completed record', async () => {
      // Mock a completed record
      const completedRecord = {
        status: 'completed',
        photo: mockApiResponse,
      };
      storageMock.getPhotoForDate.mockResolvedValue(completedRecord);

      const req = { method: 'GET', url: '/' } as any;

      let sendCalled = false;
      let statusCode = 0;
      const res = {
        send: () => {
          sendCalled = true;
        },
        set: () => res,
        status: (code: number) => {
          statusCode = code;
          return res;
        },
      } as any;

      await new Promise<void>((resolve) => {
        res.send = () => {
          sendCalled = true;
          resolve();
        };
        myFunctions.cat(req, res);
      });

      expect(sendCalled).toBe(true);
      expect(statusCode).toBe(200);
      expect(templateMock.renderPhotoPage).toHaveBeenCalledOnce();
      expect(templateMock.renderProcessingPage).not.toHaveBeenCalled();
      expect(storageMock.getPhotoForDate).toHaveBeenCalledWith(
        expect.any(String)
      );
    });

    it('should handle GET requests for root path with no completed record', async () => {
      // Mock no record found
      storageMock.getPhotoForDate.mockResolvedValue(null);

      const req = { method: 'GET', url: '/' } as any;

      let sendCalled = false;
      let statusCode = 0;
      const res = {
        send: () => {
          sendCalled = true;
        },
        set: () => res,
        status: (code: number) => {
          statusCode = code;
          return res;
        },
      } as any;

      await new Promise<void>((resolve) => {
        res.send = () => {
          sendCalled = true;
          resolve();
        };
        myFunctions.cat(req, res);
      });

      expect(sendCalled).toBe(true);
      expect(statusCode).toBe(200);
      expect(templateMock.renderProcessingPage).toHaveBeenCalledOnce();
      expect(templateMock.renderPhotoPage).not.toHaveBeenCalled();
      expect(storageMock.getPhotoForDate).toHaveBeenCalledWith(
        expect.any(String)
      );
    });

    it('should handle GET requests for specific date with completed record', async () => {
      const completedRecord = {
        status: 'completed',
        photo: mockApiResponse,
      };
      storageMock.getPhotoForDate.mockResolvedValue(completedRecord);

      const req = { method: 'GET', url: '/2025-06-27' } as any;

      let sendCalled = false;
      let statusCode = 0;
      const res = {
        send: () => {
          sendCalled = true;
        },
        set: () => res,
        status: (code: number) => {
          statusCode = code;
          return res;
        },
      } as any;

      await new Promise<void>((resolve) => {
        res.send = () => {
          sendCalled = true;
          resolve();
        };
        myFunctions.cat(req, res);
      });

      expect(sendCalled).toBe(true);
      expect(statusCode).toBe(200);
      expect(templateMock.renderPhotoPage).toHaveBeenCalledOnce();
      expect(templateMock.renderProcessingPage).not.toHaveBeenCalled();
      expect(storageMock.getPhotoForDate).toHaveBeenCalledWith('2025-06-27');
    });

    it('should handle GET requests for specific date with processing record', async () => {
      const processingRecord = {
        status: 'processing',
        photo: null,
      };
      storageMock.getPhotoForDate.mockResolvedValue(processingRecord);

      const req = { method: 'GET', url: '/2025-06-27' } as any;

      let sendCalled = false;
      let statusCode = 0;
      const res = {
        send: () => {
          sendCalled = true;
        },
        set: () => res,
        status: (code: number) => {
          statusCode = code;
          return res;
        },
      } as any;

      await new Promise<void>((resolve) => {
        res.send = () => {
          sendCalled = true;
          resolve();
        };
        myFunctions.cat(req, res);
      });

      expect(sendCalled).toBe(true);
      expect(statusCode).toBe(200);
      expect(templateMock.renderProcessingPage).toHaveBeenCalledOnce();
      expect(templateMock.renderPhotoPage).not.toHaveBeenCalled();
      expect(storageMock.getPhotoForDate).toHaveBeenCalledWith('2025-06-27');
    });

    it('should reject non-GET requests', async () => {
      const req = { method: 'POST', url: '/' } as any;
      let statusCode: number = 0;
      let message: string = '';

      const res = {
        send: (msg: string) => {
          message = msg;
        },
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

    it('should set caching headers for completed records', async () => {
      const completedRecord = {
        status: 'completed',
        photo: mockApiResponse,
      };
      storageMock.getPhotoForDate.mockResolvedValue(completedRecord);

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

    it('should set caching headers for processing pages', async () => {
      storageMock.getPhotoForDate.mockResolvedValue(null);

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

    it('should handle errors gracefully', async () => {
      storageMock.getPhotoForDate.mockRejectedValue(new Error('Storage Error'));

      const req = { method: 'GET', url: '/' } as any;
      let statusCode: number = 0;
      let message: string = '';

      const res = {
        send: (msg: string) => {
          message = msg;
        },
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

    it('should validate date format', async () => {
      const req = { method: 'GET', url: '/invalid-date' } as any;
      let statusCode: number = 0;
      let message: string = '';

      const res = {
        send: (msg: string) => {
          message = msg;
        },
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
    });

    it('should reject future dates', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDateString = futureDate.toISOString().split('T')[0];

      const req = { method: 'GET', url: `/${futureDateString}` } as any;
      let statusCode: number = 0;
      let message: string = '';

      const res = {
        send: (msg: string) => {
          message = msg;
        },
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
    });

    it('should validate date values', async () => {
      const req = { method: 'GET', url: '/2025-13-45' } as any;
      let statusCode: number = 0;
      let message: string = '';

      const res = {
        send: (msg: string) => {
          message = msg;
        },
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
    });

    it('should pass correct template data to renderPhotoPage', async () => {
      const completedRecord = {
        status: 'completed',
        photo: mockApiResponse,
      };
      storageMock.getPhotoForDate.mockResolvedValue(completedRecord);

      const req = { method: 'GET', url: '/2025-06-27' } as any;

      const res = {
        send: () => {},
        set: () => res,
        status: () => res,
      } as any;

      await new Promise<void>((resolve) => {
        res.send = () => {
          resolve();
        };
        myFunctions.cat(req, res);
      });

      expect(templateMock.renderPhotoPage).toHaveBeenCalledWith({
        linkUrl: mockApiResponse.links.html,
        imageUrl: mockApiResponse.urls.full,
        userProfileImage: mockApiResponse.user.profile_image.medium,
        userName: mockApiResponse.user.name,
        userUsername: mockApiResponse.user.username,
        userProfileUrl: mockApiResponse.user.links.html,
        likesCount: mockApiResponse.likes.toLocaleString(),
        altDescription: mockApiResponse.alt_description,
        tags: mockApiResponse.tags,
        prevDateUrl: '/2025-06-26',
        nextDateUrl: '/2025-06-28',
        showNextArrow: true,
      });
    });

    it('should pass correct template data to renderProcessingPage', async () => {
      storageMock.getPhotoForDate.mockResolvedValue(null);

      const req = { method: 'GET', url: '/2025-06-27' } as any;

      const res = {
        send: () => {},
        set: () => res,
        status: () => res,
      } as any;

      await new Promise<void>((resolve) => {
        res.send = () => {
          resolve();
        };
        myFunctions.cat(req, res);
      });

      expect(templateMock.renderProcessingPage).toHaveBeenCalledWith({
        linkUrl: '',
        imageUrl: '',
        userProfileImage: '',
        userName: '',
        userUsername: '',
        userProfileUrl: '',
        likesCount: '',
        altDescription: '',
        tags: [],
        prevDateUrl: '/2025-06-26',
        nextDateUrl: '/2025-06-28',
        showNextArrow: true,
      });
    });

    it('should handle query parameters in URL', async () => {
      const completedRecord = {
        status: 'completed',
        photo: mockApiResponse,
      };
      storageMock.getPhotoForDate.mockResolvedValue(completedRecord);

      const req = { method: 'GET', url: '/?test=1&param=value' } as any;

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

      expect(sendCalled).toBe(true);
      expect(templateMock.renderPhotoPage).toHaveBeenCalledOnce();
    });

    it('should handle photo without alt_description', async () => {
      const photoWithoutAlt = { ...mockApiResponse };
      delete photoWithoutAlt.alt_description;

      const completedRecord = {
        status: 'completed',
        photo: photoWithoutAlt,
      };
      storageMock.getPhotoForDate.mockResolvedValue(completedRecord);

      const req = { method: 'GET', url: '/' } as any;

      const res = {
        send: () => {},
        set: () => res,
        status: () => res,
      } as any;

      await new Promise<void>((resolve) => {
        res.send = () => {
          resolve();
        };
        myFunctions.cat(req, res);
      });

      expect(templateMock.renderPhotoPage).toHaveBeenCalledWith(
        expect.objectContaining({
          altDescription: 'Cat photo',
        })
      );
    });

    it('should handle leap year dates correctly', async () => {
      const completedRecord = {
        status: 'completed',
        photo: mockApiResponse,
      };
      storageMock.getPhotoForDate.mockResolvedValue(completedRecord);

      const req = { method: 'GET', url: '/2024-02-29' } as any; // Leap year

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

      expect(sendCalled).toBe(true);
      expect(storageMock.getPhotoForDate).toHaveBeenCalledWith('2024-02-29');
    });

    it('should reject invalid leap year dates', async () => {
      const req = { method: 'GET', url: '/2023-02-29' } as any; // Not a leap year

      let statusCode: number = 0;
      let message: string = '';

      const res = {
        send: (msg: string) => {
          message = msg;
        },
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
    });

    it('should create a new day record when none exists', async () => {
      // Mock no existing record
      storageMock.getPhotoForDate.mockResolvedValue(null);

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

      expect(sendCalled).toBe(true);
      expect(storageMock.createNewDayRecord).toHaveBeenCalledWith('2025-06-27');
      expect(templateMock.renderProcessingPage).toHaveBeenCalledOnce();
    });

    it('should not create a new day record when one already exists', async () => {
      // Mock existing processing record
      const processingRecord = {
        status: 'processing',
        photo: null,
      };
      storageMock.getPhotoForDate.mockResolvedValue(processingRecord);

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

      expect(sendCalled).toBe(true);
      expect(storageMock.createNewDayRecord).not.toHaveBeenCalled();
      expect(templateMock.renderProcessingPage).toHaveBeenCalledOnce();
    });
  });
});
