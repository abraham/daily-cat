import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firebase Admin before importing the module
const mockGet = vi.fn();

vi.mock('firebase-admin/app', () => ({
  getApps: vi.fn(() => [{}]), // Return existing app
  initializeApp: vi.fn(() => ({})),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn(() => ({
      where: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            get: mockGet,
          })),
        })),
      })),
    })),
  })),
}));

// Mock Firebase Functions
vi.mock('firebase-functions/logger', () => ({
  log: vi.fn(),
  error: vi.fn(),
}));

vi.mock('firebase-functions/v2/https', () => ({
  onRequest: vi.fn((options, handler) => handler),
}));

// Mock config storage
vi.mock('../storage/config-storage', () => ({
  getConfig: vi.fn(),
}));

describe('sitemap function', () => {
  let mockRequest: any;
  let mockResponse: any;
  let configStorageMock: any;
  let myFunctions: any;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Clear module cache first
    vi.resetModules();

    // Get the mocked modules after reset
    configStorageMock = await import('../storage/config-storage.js');

    // Set up default config mock
    configStorageMock.getConfig.mockResolvedValue({
      minDate: '2024-01-01',
    });

    mockRequest = {
      method: 'GET',
      get: vi.fn((header) => {
        if (header === 'x-forwarded-host') return 'example.com';
        if (header === 'x-forwarded-proto') return 'https';
        return null;
      }),
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
      set: vi.fn(),
    };

    // Import the module after all mocks are set up
    myFunctions = await import('./sitemap-task.js');
  });

  it('should reject non-GET requests', async () => {
    mockRequest.method = 'POST';

    await myFunctions.sitemap(mockRequest, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(405);
    expect(mockResponse.send).toHaveBeenCalledWith(
      'Method not allowed. Use GET.'
    );
  });

  it('should generate valid XML sitemap format', async () => {
    // Mock Firestore response
    const mockSnapshot = {
      docs: [
        {
          id: '2024-01-01',
          data: () => ({
            status: 'completed',
            updatedAt: {
              toDate: () => new Date('2024-01-01T12:00:00Z'),
            },
          }),
        },
        {
          id: '2024-01-02',
          data: () => ({
            status: 'completed',
            updatedAt: {
              toDate: () => new Date('2024-01-02T12:00:00Z'),
            },
          }),
        },
      ],
    };

    mockGet.mockResolvedValue(mockSnapshot);

    await myFunctions.sitemap(mockRequest, mockResponse);

    expect(mockResponse.set).toHaveBeenCalledWith(
      'Content-Type',
      'application/xml'
    );
    expect(mockResponse.set).toHaveBeenCalledWith(
      'Cache-Control',
      'public, max-age=3600'
    );
    expect(mockResponse.status).toHaveBeenCalledWith(200);

    const sentXml = mockResponse.send.mock.calls[0][0];

    // Check XML structure
    expect(sentXml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(sentXml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    );
    expect(sentXml).toContain('</urlset>');

    // Check homepage entry
    expect(sentXml).toContain('<loc>https://example.com/</loc>');

    // Check day entries
    expect(sentXml).toContain('<loc>https://example.com/2024-01-01</loc>');
    expect(sentXml).toContain('<loc>https://example.com/2024-01-02</loc>');
    expect(sentXml).toContain('<lastmod>2024-01-01</lastmod>');
    expect(sentXml).toContain('<lastmod>2024-01-02</lastmod>');
  });

  it('should handle empty results gracefully', async () => {
    // Mock empty Firestore response
    const mockSnapshot = {
      docs: [],
    };

    mockGet.mockResolvedValue(mockSnapshot);

    await myFunctions.sitemap(mockRequest, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(200);

    const sentXml = mockResponse.send.mock.calls[0][0];

    // Should still contain valid XML structure with just homepage
    expect(sentXml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(sentXml).toContain('<loc>https://example.com/</loc>');
  });

  it('should handle database errors', async () => {
    // Mock Firestore error
    mockGet.mockRejectedValue(new Error('Database error'));

    await myFunctions.sitemap(mockRequest, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.send).toHaveBeenCalledWith('Error generating sitemap');
  });
});
