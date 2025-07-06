import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Firebase Admin Messaging
const mockSend = vi.fn();
const mockGetMessaging = vi.fn(() => ({
  send: mockSend,
}));

vi.mock('firebase-admin/messaging', () => ({
  getMessaging: mockGetMessaging,
}));

// Mock Firebase Functions Logger
const mockLogger = {
  log: vi.fn(),
  error: vi.fn(),
};

vi.mock('firebase-functions/logger', () => mockLogger);

// Mock Firebase Functions Scheduler
const mockOnSchedule = vi.fn();

vi.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: mockOnSchedule,
}));

describe('send-notifications-task', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should configure the scheduled function correctly', async () => {
    // Import the task (this will call onSchedule)
    await import('./send-notifications-task.js');

    expect(mockOnSchedule).toHaveBeenCalledWith(
      {
        schedule: '15 * * * *',
        timeZone: 'UTC',
      },
      expect.any(Function)
    );
  });

  it('should send notification to correct topic for current hour', async () => {
    // Set a specific time for testing
    const testDate = new Date('2024-03-15T14:15:00.000Z'); // 14:15 UTC
    vi.setSystemTime(testDate);

    // Mock successful message send
    mockSend.mockResolvedValueOnce('mock-message-id');

    // Import and get the scheduled function
    await import('./send-notifications-task.js');

    // Get the handler function from the onSchedule mock
    const handlerFunction = mockOnSchedule.mock.calls[0][1];

    // Call the handler
    await handlerFunction();

    // Verify the message was sent with correct topic
    expect(mockSend).toHaveBeenCalledWith({
      topic: '/topics/hour-14',
      notification: {
        title: 'Daily Cat',
        body: 'New cat is ready for you!',
      },
      webpush: {
        fcmOptions: {
          link: 'https://daily.cat',
        },
      },
    });

    // Verify logging
    expect(mockLogger.log).toHaveBeenCalledWith(
      'Starting scheduled notification send task'
    );
    expect(mockLogger.log).toHaveBeenCalledWith(
      'Sending notification to topic: /topics/hour-14'
    );
    expect(mockLogger.log).toHaveBeenCalledWith(
      'Successfully sent notification. Message ID: mock-message-id'
    );
  });

  it('should format hour correctly for single digit hours', async () => {
    // Test with single digit hour
    const testDate = new Date('2024-03-15T05:15:00.000Z'); // 05:15 UTC
    vi.setSystemTime(testDate);

    mockSend.mockResolvedValueOnce('mock-message-id');

    await import('./send-notifications-task.js');
    const handlerFunction = mockOnSchedule.mock.calls[0][1];

    await handlerFunction();

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: '/topics/hour-05',
      })
    );
  });

  it('should handle midnight hour correctly', async () => {
    // Test with midnight hour
    const testDate = new Date('2024-03-15T00:15:00.000Z'); // 00:15 UTC
    vi.setSystemTime(testDate);

    mockSend.mockResolvedValueOnce('mock-message-id');

    await import('./send-notifications-task.js');
    const handlerFunction = mockOnSchedule.mock.calls[0][1];

    await handlerFunction();

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: '/topics/hour-00',
      })
    );
  });

  it('should handle errors and rethrow them', async () => {
    const testDate = new Date('2024-03-15T10:15:00.000Z');
    vi.setSystemTime(testDate);

    const mockError = new Error('Failed to send message');
    mockSend.mockRejectedValueOnce(mockError);

    await import('./send-notifications-task.js');
    const handlerFunction = mockOnSchedule.mock.calls[0][1];

    // Should throw the error
    await expect(handlerFunction()).rejects.toThrow('Failed to send message');

    // Should log the error
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error sending scheduled notification:',
      mockError
    );
  });
});
