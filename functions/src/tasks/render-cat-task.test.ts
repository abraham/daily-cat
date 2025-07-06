import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { Timestamp } from 'firebase-admin/firestore';

// Load the actual photo.json fixture
const photoFixturePath = path.join(__dirname, '..', 'fixtures', 'photo.json');
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

vi.mock('firebase-admin/firestore', async () => {
  const actual = await vi.importActual('firebase-admin/firestore');
  return {
    Timestamp: actual.Timestamp,
    getFirestore: vi.fn(() => mockFirestore),
  };
});

// Mock the storage modules
vi.mock('../storage/day-storage', () => ({
  getPhotoForDate: vi.fn(),
  createNewDayRecord: vi.fn(),
  setDayRecordProcessing: vi.fn(),
}));

vi.mock('../storage/config-storage', () => ({
  getConfig: vi.fn(),
}));

// Mock the template module
vi.mock('../template', () => ({
  renderPhotoPage: vi.fn(),
  renderProcessingPage: vi.fn(),
}));

// Mock lit-html SSR
vi.mock('@lit-labs/ssr', () => ({
  render: vi.fn().mockReturnValue(['mocked html']),
}));

describe('Cat Function', () => {
  let dayStorageMock: any;
  let configStorageMock: any;
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
    dayStorageMock = await import('../storage/day-storage.js');
    configStorageMock = await import('../storage/config-storage.js');
    templateMock = await import('../template.js');

    dayStorageMock.getPhotoForDate.mockResolvedValue(null); // Default: no existing photo
    dayStorageMock.createNewDayRecord.mockResolvedValue({
      id: 'test-date',
      status: 'created',
      photo: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    configStorageMock.getConfig.mockResolvedValue({
      minDate: '2025-01-01',
    });
    templateMock.renderPhotoPage.mockReturnValue('mocked photo page html');
    templateMock.renderProcessingPage.mockReturnValue(
      'mocked processing page html'
    );

    // Import the functions after mocks are set up
    myFunctions = await import('./render-cat-task.js');
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
      dayStorageMock.getPhotoForDate.mockResolvedValue(completedRecord);

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
      expect(dayStorageMock.getPhotoForDate).toHaveBeenCalledWith(
        expect.any(String)
      );
    });

    it('should handle GET requests for root path with no completed record', async () => {
      // Mock no record found
      dayStorageMock.getPhotoForDate.mockResolvedValue(null);

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
      expect(dayStorageMock.getPhotoForDate).toHaveBeenCalledWith(
        expect.any(String)
      );
    });

    it('should handle GET requests for specific date with completed record', async () => {
      const completedRecord = {
        status: 'completed',
        photo: mockApiResponse,
      };
      dayStorageMock.getPhotoForDate.mockResolvedValue(completedRecord);

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
      expect(dayStorageMock.getPhotoForDate).toHaveBeenCalledWith('2025-06-27');
    });

    it('should handle GET requests for specific date with processing record', async () => {
      const processingRecord = {
        status: 'processing',
        photo: null,
      };
      dayStorageMock.getPhotoForDate.mockResolvedValue(processingRecord);

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
      expect(dayStorageMock.getPhotoForDate).toHaveBeenCalledWith('2025-06-27');
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
      dayStorageMock.getPhotoForDate.mockResolvedValue(completedRecord);

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
      dayStorageMock.getPhotoForDate.mockResolvedValue(null);

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
      dayStorageMock.getPhotoForDate.mockRejectedValue(
        new Error('Storage Error')
      );

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

    it('should reject dates before configured minDate', async () => {
      configStorageMock.getConfig.mockResolvedValue({
        minDate: '2025-01-01',
      });

      const req = { method: 'GET', url: '/2024-12-31' } as any;
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
      expect(message).toBe(
        'Forbidden! Dates before 2025-01-01 are not allowed.'
      );
    });

    it('should use custom minDate from config', async () => {
      configStorageMock.getConfig.mockResolvedValue({
        minDate: '2025-06-01',
      });

      const req = { method: 'GET', url: '/2025-05-31' } as any;
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
      expect(message).toBe(
        'Forbidden! Dates before 2025-06-01 are not allowed.'
      );
    });

    it('should allow dates on or after configured minDate', async () => {
      configStorageMock.getConfig.mockResolvedValue({
        minDate: '2025-06-01',
      });

      const completedRecord = {
        status: 'completed',
        photo: mockApiResponse,
      };
      dayStorageMock.getPhotoForDate.mockResolvedValue(completedRecord);

      const req = { method: 'GET', url: '/2025-06-01' } as any;
      let statusCode: number = 0;

      const res = {
        send: () => {},
        set: () => res,
        status: (code: number) => {
          statusCode = code;
          return res;
        },
      } as any;

      await new Promise<void>((resolve) => {
        res.send = () => {
          resolve();
        };
        myFunctions.cat(req, res);
      });

      expect(statusCode).toBe(200);
      expect(dayStorageMock.getPhotoForDate).toHaveBeenCalledWith('2025-06-01');
    });

    it('should handle config retrieval errors', async () => {
      configStorageMock.getConfig.mockRejectedValue(
        new Error('Config not found')
      );

      const req = { method: 'GET', url: '/2025-06-01' } as any;
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

    it('should pass correct template data to renderPhotoPage', async () => {
      const completedRecord = {
        status: 'completed',
        photo: mockApiResponse,
      };
      dayStorageMock.getPhotoForDate.mockResolvedValue(completedRecord);

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
        imageUrl: mockApiResponse.urls.regular,
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
      dayStorageMock.getPhotoForDate.mockResolvedValue(null);

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
      dayStorageMock.getPhotoForDate.mockResolvedValue(completedRecord);

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
      dayStorageMock.getPhotoForDate.mockResolvedValue(completedRecord);

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

    it('should handle valid dates in 2025', async () => {
      const completedRecord = {
        status: 'completed',
        photo: mockApiResponse,
      };
      dayStorageMock.getPhotoForDate.mockResolvedValue(completedRecord);

      const req = { method: 'GET', url: '/2025-02-28' } as any; // Valid date in 2025

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
      expect(dayStorageMock.getPhotoForDate).toHaveBeenCalledWith('2025-02-28');
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
      dayStorageMock.getPhotoForDate.mockResolvedValue(null);

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
      expect(dayStorageMock.createNewDayRecord).toHaveBeenCalledWith(
        '2025-06-27'
      );
      expect(templateMock.renderProcessingPage).toHaveBeenCalledOnce();
    });

    it('should not create a new day record when one already exists', async () => {
      // Mock existing processing record
      const processingRecord = {
        status: 'processing',
        photo: null,
      };
      dayStorageMock.getPhotoForDate.mockResolvedValue(processingRecord);

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
      expect(dayStorageMock.createNewDayRecord).not.toHaveBeenCalled();
      expect(templateMock.renderProcessingPage).toHaveBeenCalledOnce();
    });
  });
});
