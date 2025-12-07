import { describe, it, expect, vi, beforeEach } from 'vitest';
import { topics } from './topics-task';
import { Timestamp } from 'firebase-admin/firestore';

// Mock Firebase functions
vi.mock('firebase-functions/logger', () => ({
  log: vi.fn(),
  error: vi.fn(),
}));

vi.mock('firebase-functions/v2/https', () => ({
  onRequest: vi.fn((handler) => handler),
}));

let mockMessaging: any;

vi.mock('firebase-admin/messaging', () => ({
  getMessaging: vi.fn(() => mockMessaging),
}));

// Mock storage functions
vi.mock('../storage/token-storage', () => ({
  getTokenDocument: vi.fn(),
  saveTokenDocument: vi.fn(),
  deleteTokenDocument: vi.fn(),
}));

describe('topics task', () => {
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      method: 'POST',
      query: {
        token: 'test-token-123456789',
      },
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
      json: vi.fn(),
    };

    mockMessaging = {
      subscribeToTopic: vi.fn(),
      unsubscribeFromTopic: vi.fn(),
    };

    // Mock current date to ensure consistent hour
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T12:00:00Z')); // 12:00 UTC
  });

  it('should return 400 if token is missing', async () => {
    mockRequest.query.token = undefined;

    await topics(mockRequest, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.send).toHaveBeenCalledWith('Missing token parameter');
  });

  it('should return 400 if token is invalid', async () => {
    mockRequest.query.token = 'short';

    await topics(mockRequest, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.send).toHaveBeenCalledWith('Invalid token format');
  });

  it('should return 405 for unsupported HTTP methods', async () => {
    mockRequest.method = 'GET';

    await topics(mockRequest, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(405);
    expect(mockResponse.send).toHaveBeenCalledWith(
      'Method not allowed. Use POST or DELETE.'
    );
  });

  it('should handle POST request for subscription', async () => {
    const { getTokenDocument, saveTokenDocument } =
      await import('../storage/token-storage.js');

    const mockGetTokenDocument = getTokenDocument as any;
    const mockSaveTokenDocument = saveTokenDocument as any;

    mockGetTokenDocument.mockResolvedValue(null);
    mockSaveTokenDocument.mockResolvedValue(undefined);
    mockMessaging.subscribeToTopic.mockResolvedValue({ successCount: 1 });

    await topics(mockRequest, mockResponse);

    expect(mockMessaging.subscribeToTopic).toHaveBeenCalledWith(
      ['test-token-123456789'],
      'hour-12'
    );
    expect(mockSaveTokenDocument).toHaveBeenCalledWith('test-token-123456789', {
      token: 'test-token-123456789',
      createdAt: expect.any(Timestamp),
      updatedAt: expect.any(Timestamp),
      topics: ['hour-12'],
    });
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: true,
      message: 'Subscribed to topic: hour-12',
      topics: ['hour-12'],
    });
  });

  it('should handle subscription failure when subscribeToTopic fails', async () => {
    const { getTokenDocument, saveTokenDocument } =
      await import('../storage/token-storage.js');

    const mockGetTokenDocument = getTokenDocument as any;
    const mockSaveTokenDocument = saveTokenDocument as any;

    mockGetTokenDocument.mockResolvedValue(null);
    mockSaveTokenDocument.mockResolvedValue(undefined);

    // Mock a subscription failure
    mockMessaging.subscribeToTopic.mockResolvedValue({
      successCount: 0,
      failureCount: 1,
    });

    // The function should throw an error and return 500
    await topics(mockRequest, mockResponse);

    expect(mockMessaging.subscribeToTopic).toHaveBeenCalledWith(
      ['test-token-123456789'],
      'hour-12'
    );
    // Should not save token document on subscription failure
    expect(mockSaveTokenDocument).not.toHaveBeenCalled();
    // Should return 500 error due to subscription failure
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.send).toHaveBeenCalledWith('Internal server error');
  });

  it('should handle DELETE request for unsubscription', async () => {
    mockRequest.method = 'DELETE';

    const { getTokenDocument, deleteTokenDocument } =
      await import('../storage/token-storage.js');

    const mockGetTokenDocument = getTokenDocument as any;
    const mockDeleteTokenDocument = deleteTokenDocument as any;

    const existingToken = {
      token: 'test-token-123456789',
      timestamp: Date.now(),
      topics: ['hour-12', 'hour-13'],
    };

    mockGetTokenDocument.mockResolvedValue(existingToken);
    mockDeleteTokenDocument.mockResolvedValue(undefined);
    mockMessaging.unsubscribeFromTopic.mockResolvedValue(undefined);

    await topics(mockRequest, mockResponse);

    expect(mockMessaging.unsubscribeFromTopic).toHaveBeenCalledWith(
      ['test-token-123456789'],
      'hour-12'
    );
    expect(mockMessaging.unsubscribeFromTopic).toHaveBeenCalledWith(
      ['test-token-123456789'],
      'hour-13'
    );
    expect(mockDeleteTokenDocument).toHaveBeenCalledWith(
      'test-token-123456789'
    );
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: true,
      message: 'Unsubscribed from all topics and deleted token',
      unsubscribedTopics: ['hour-12', 'hour-13'],
    });
  });

  it('should return 404 for DELETE request when token is not found', async () => {
    mockRequest.method = 'DELETE';

    const { getTokenDocument } = await import('../storage/token-storage.js');
    const mockGetTokenDocument = getTokenDocument as any;

    mockGetTokenDocument.mockResolvedValue(null);

    await topics(mockRequest, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.send).toHaveBeenCalledWith('Token not found');
  });
});
