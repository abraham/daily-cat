import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';

const mocks = vi.hoisted(() => ({
  getTokensUpdatedBefore: vi.fn(),
  touchTokenDocuments: vi.fn(),
  deleteTokenDocuments: vi.fn(),
  sendEach: vi.fn(),
  unsubscribeFromTopic: vi.fn(),
  handler: undefined as undefined | (() => Promise<void>),
}));

vi.mock('./token-storage', () => ({
  getTokensUpdatedBefore: mocks.getTokensUpdatedBefore,
  touchTokenDocuments: mocks.touchTokenDocuments,
  deleteTokenDocuments: mocks.deleteTokenDocuments,
}));

vi.mock('firebase-admin/messaging', () => ({
  getMessaging: () => ({
    sendEach: mocks.sendEach,
    unsubscribeFromTopic: mocks.unsubscribeFromTopic,
  }),
}));

vi.mock('firebase-functions/logger', () => ({
  log: vi.fn(),
  error: vi.fn(),
}));

vi.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: vi.fn((options, handler) => {
    mocks.handler = handler;
    return handler;
  }),
}));

const token = (id: string, topics: string[]) => ({
  token: id,
  topics,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
});

const ok = { success: true };
const failed = (code: string) => ({ success: false, error: { code } });

describe('pruneTokensScheduled', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-30T00:00:00Z'));
    mocks.touchTokenDocuments.mockResolvedValue(undefined);
    mocks.deleteTokenDocuments.mockResolvedValue(undefined);
    mocks.unsubscribeFromTopic.mockResolvedValue(undefined);
    await import('./prune-tokens-task.js');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('checks up to 500 tokens not confirmed in 30 days', async () => {
    mocks.getTokensUpdatedBefore.mockResolvedValue([]);

    await mocks.handler!();

    const [cutoff, limit] = mocks.getTokensUpdatedBefore.mock.calls[0];
    expect((cutoff as Timestamp).toDate()).toEqual(
      new Date('2025-05-31T00:00:00Z')
    );
    expect(limit).toBe(500);
    expect(mocks.sendEach).not.toHaveBeenCalled();
  });

  it('validates tokens with a dry-run send', async () => {
    mocks.getTokensUpdatedBefore.mockResolvedValue([
      token('a-token', ['hour-01']),
    ]);
    mocks.sendEach.mockResolvedValue({ responses: [ok] });

    await mocks.handler!();

    expect(mocks.sendEach).toHaveBeenCalledWith(
      [{ token: 'a-token', data: { type: 'token-check' } }],
      true
    );
  });

  it('deletes dead tokens, unsubscribes them by topic, and keeps the rest', async () => {
    mocks.getTokensUpdatedBefore.mockResolvedValue([
      token('alive', ['hour-01']),
      token('unregistered', ['hour-01', 'hour-02']),
      token('invalid', ['hour-01']),
      token('flaky', ['hour-03']),
    ]);
    mocks.sendEach.mockResolvedValue({
      responses: [
        ok,
        failed('messaging/registration-token-not-registered'),
        failed('messaging/invalid-registration-token'),
        failed('messaging/internal-error'),
      ],
    });
    mocks.unsubscribeFromTopic.mockRejectedValueOnce(new Error('FCM down'));

    await mocks.handler!();

    expect(mocks.unsubscribeFromTopic).toHaveBeenCalledWith(
      ['unregistered', 'invalid'],
      'hour-01'
    );
    expect(mocks.unsubscribeFromTopic).toHaveBeenCalledWith(
      ['unregistered'],
      'hour-02'
    );
    expect(mocks.deleteTokenDocuments).toHaveBeenCalledWith([
      'unregistered',
      'invalid',
    ]);
    expect(mocks.touchTokenDocuments).toHaveBeenCalledWith(['alive', 'flaky']);
  });
});
