import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getApp } from './firebase';

vi.mock('firebase-admin/app', () => ({
  getApps: vi.fn(),
  initializeApp: vi.fn(),
}));

describe('getApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the existing app', () => {
    const existing = { name: 'existing' };
    vi.mocked(getApps).mockReturnValue([existing as any]);

    expect(getApp()).toBe(existing);
    expect(initializeApp).not.toHaveBeenCalled();
  });

  it('initializes an app when none exists', () => {
    const created = { name: 'created' };
    vi.mocked(getApps).mockReturnValue([]);
    vi.mocked(initializeApp).mockReturnValue(created as any);

    expect(getApp()).toBe(created);
    expect(initializeApp).toHaveBeenCalledTimes(1);
  });
});
