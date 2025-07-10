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

describe('Index and Show Functions', () => {
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

  describe('index function', () => {
    it('should handle GET requests and always use current date', async () => {
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
        myFunctions.index(req, res);
      });

      expect(sendCalled).toBe(true);
      expect(statusCode).toBe(200);
      expect(templateMock.renderPhotoPage).toHaveBeenCalledOnce();
      expect(dayStorageMock.getPhotoForDate).toHaveBeenCalledWith(
        expect.any(String)
      );
      // Verify it was called with current date (format: YYYY-MM-DD)
      const callArgument = dayStorageMock.getPhotoForDate.mock.calls[0][0];
      expect(callArgument).toMatch(/^\d{4}-\d{2}-\d{2}$/);
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
        myFunctions.index(req, res);
      });

      expect(statusCode).toBe(403);
      expect(message).toBe('Forbidden!');
    });

    it('should handle processing page when no completed record exists', async () => {
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
        myFunctions.index(req, res);
      });

      expect(sendCalled).toBe(true);
      expect(statusCode).toBe(200);
      expect(templateMock.renderProcessingPage).toHaveBeenCalledOnce();
      expect(templateMock.renderPhotoPage).not.toHaveBeenCalled();
    });
  });

  describe('show function', () => {
    it('should handle GET requests for specific valid dates', async () => {
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
        myFunctions.show(req, res);
      });

      expect(sendCalled).toBe(true);
      expect(statusCode).toBe(200);
      expect(templateMock.renderPhotoPage).toHaveBeenCalledOnce();
      expect(dayStorageMock.getPhotoForDate).toHaveBeenCalledWith('2025-06-27');
    });

    it('should reject invalid date format', async () => {
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
        myFunctions.show(req, res);
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
        myFunctions.show(req, res);
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
        myFunctions.show(req, res);
      });

      expect(statusCode).toBe(403);
      expect(message).toBe(
        'Forbidden! Dates before 2025-01-01 are not allowed.'
      );
    });

    it('should reject non-GET requests', async () => {
      const req = { method: 'POST', url: '/2025-06-27' } as any;
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
        myFunctions.show(req, res);
      });

      expect(statusCode).toBe(403);
      expect(message).toBe('Forbidden!');
    });

    it('should handle processing page when no completed record exists', async () => {
      dayStorageMock.getPhotoForDate.mockResolvedValue(null);

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
        myFunctions.show(req, res);
      });

      expect(sendCalled).toBe(true);
      expect(statusCode).toBe(200);
      expect(templateMock.renderProcessingPage).toHaveBeenCalledOnce();
      expect(templateMock.renderPhotoPage).not.toHaveBeenCalled();
      expect(dayStorageMock.getPhotoForDate).toHaveBeenCalledWith('2025-06-27');
    });
  });
});