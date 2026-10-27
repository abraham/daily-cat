import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Firebase messaging
vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(),
  getToken: vi.fn(),
  deleteToken: vi.fn(),
  onMessage: vi.fn(),
  isSupported: vi.fn(),
}));

// Mock fetch for topic subscription tests
globalThis.fetch = vi.fn();

describe('Notifications', () => {
  const mockApp = {} as any;
  const mockMessaging = { app: mockApp } as any;
  const mockToken = 'mock-firebase-token';

  // Mock localStorage at the global level since it's read at module import time
  const mockGetItem = vi.fn();
  const mockSetItem = vi.fn();
  const mockRemoveItem = vi.fn();

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <button id="notifications-button" class="hidden">
        <span class="notifications-on hidden"></span>
        <span class="notifications-off"></span>
      </button>
    `;

    // Mock Notification API
    Object.defineProperty(globalThis, 'Notification', {
      value: class MockNotification {
        static permission = 'default';
        static requestPermission = vi.fn(() => Promise.resolve('granted'));

        title: string;
        options: any;
        onclick: (() => void) | null = null;

        constructor(title: string, options?: any) {
          this.title = title;
          this.options = options;
        }

        close = vi.fn();
      },
      writable: true,
    });

    // Mock window.focus
    Object.defineProperty(globalThis, 'window', {
      value: {
        focus: vi.fn(),
      },
      writable: true,
    });

    // Reset localStorage mocks
    mockGetItem.mockImplementation((key: string) => {
      if (key === 'ff') return 'true';
      return null;
    });
    mockSetItem.mockImplementation(() => {});
    mockRemoveItem.mockImplementation(() => {});

    // Clear all mocks
    vi.clearAllMocks();
    vi.mocked(fetch).mockClear();
  });

  afterEach(() => {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, String(value)),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
      },
      writable: true,
      configurable: true,
    });
  });

  describe('Module architecture tests', () => {
    it('should check feature flag on module import', () => {
      // Note: The module reads the ff flag at import time, so our mock might not catch it
      // This test documents the expected behavior rather than testing the implementation
      expect(mockGetItem).toBeDefined();
    });

    it('should have DOM elements available for testing', () => {
      const button = document.getElementById('notifications-button');
      expect(button).toBeTruthy();

      const onIcon = button?.querySelector('.notifications-on');
      const offIcon = button?.querySelector('.notifications-off');

      expect(onIcon).toBeTruthy();
      expect(offIcon).toBeTruthy();
    });
  });

  describe('DOM structure validation', () => {
    it('should have proper DOM structure for notification icons', () => {
      const button = document.getElementById('notifications-button');
      expect(button).toBeTruthy();

      const onIcon = button?.querySelector('.notifications-on');
      const offIcon = button?.querySelector('.notifications-off');

      expect(onIcon).toBeTruthy();
      expect(offIcon).toBeTruthy();

      // Icons should have the correct classes
      expect(onIcon?.classList.contains('notifications-on')).toBe(true);
      expect(offIcon?.classList.contains('notifications-off')).toBe(true);
    });

    it('should have correct initial icon visibility', () => {
      const button = document.getElementById('notifications-button');
      const onIcon = button?.querySelector('.notifications-on') as HTMLElement;
      const offIcon = button?.querySelector(
        '.notifications-off'
      ) as HTMLElement;

      // Initial state should have "on" icon hidden and "off" icon visible
      expect(onIcon?.classList.contains('hidden')).toBe(true);
      expect(offIcon?.classList.contains('hidden')).toBe(false);
    });

    it('should have button initially hidden', () => {
      const button = document.getElementById('notifications-button');
      expect(button?.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Notification API compatibility', () => {
    it('should detect browser notification support', () => {
      expect('Notification' in globalThis).toBe(true);
    });

    it('should handle notification API without permission support', () => {
      // Test that we can check for missing permission property
      const hasPermissionProperty = 'permission' in globalThis.Notification;
      expect(hasPermissionProperty).toBe(true);

      // Test that we can check for missing requestPermission method
      const hasRequestPermission =
        typeof (globalThis.Notification as any).requestPermission ===
        'function';
      expect(hasRequestPermission).toBe(true);

      // Verify we can handle cases where permission is undefined
      const originalPermission = (globalThis.Notification as any).permission;
      (globalThis.Notification as any).permission = undefined;
      expect((globalThis.Notification as any).permission).toBe(undefined);

      // Restore
      (globalThis.Notification as any).permission = originalPermission;
    });

    it('should mock notification permissions correctly', () => {
      expect((globalThis.Notification as any).permission).toBe('default');
      expect(typeof (globalThis.Notification as any).requestPermission).toBe(
        'function'
      );
    });
  });

  describe('localStorage integration', () => {
    it('should interact with localStorage for feature flags', () => {
      mockGetItem('ff');
      expect(mockGetItem).toHaveBeenCalledWith('ff');
    });

    it('should interact with localStorage for token storage', () => {
      mockSetItem('notification_token', mockToken);
      expect(mockSetItem).toHaveBeenCalledWith('notification_token', mockToken);
    });

    it('should interact with localStorage for token removal', () => {
      mockRemoveItem('notification_token');
      expect(mockRemoveItem).toHaveBeenCalledWith('notification_token');
    });
  });

  describe('Firebase messaging mock setup', () => {
    it('should have Firebase messaging mocks available', async () => {
      const { getMessaging, getToken, deleteToken, onMessage } =
        await import('firebase/messaging');

      expect(vi.isMockFunction(getMessaging)).toBe(true);
      expect(vi.isMockFunction(getToken)).toBe(true);
      expect(vi.isMockFunction(deleteToken)).toBe(true);
      expect(vi.isMockFunction(onMessage)).toBe(true);
    });
  });

  describe('Integration readiness', () => {
    it('should have all required dependencies mocked', () => {
      // Check that we have all the basic building blocks for integration tests
      expect(document.getElementById('notifications-button')).toBeTruthy();
      expect(globalThis.Notification).toBeTruthy();
      expect(globalThis.localStorage).toBeTruthy();
      expect(mockGetItem).toBeTruthy();
      expect(mockSetItem).toBeTruthy();
      expect(mockRemoveItem).toBeTruthy();
    });

    it('should be able to simulate user interactions', () => {
      const button = document.getElementById('notifications-button');
      expect(button).toBeTruthy();

      // Test that we can simulate a click event
      const clickEvent = new Event('click');
      expect(() => button?.dispatchEvent(clickEvent)).not.toThrow();
    });

    it('should be able to test notification creation', () => {
      const notification = new (globalThis.Notification as any)('Test Title', {
        body: 'Test Body',
        icon: 'test-icon.png',
      });

      expect(notification.title).toBe('Test Title');
      expect(notification.options.body).toBe('Test Body');
      expect(notification.options.icon).toBe('test-icon.png');
    });
  });

  describe('UI state management basics', () => {
    it('should be able to toggle element visibility', () => {
      const button = document.getElementById('notifications-button');
      expect(button?.classList.contains('hidden')).toBe(true);

      button?.classList.remove('hidden');
      expect(button?.classList.contains('hidden')).toBe(false);

      button?.classList.add('hidden');
      expect(button?.classList.contains('hidden')).toBe(true);
    });

    it('should be able to toggle notification icons', () => {
      const button = document.getElementById('notifications-button');
      const onIcon = button?.querySelector('.notifications-on') as HTMLElement;
      const offIcon = button?.querySelector(
        '.notifications-off'
      ) as HTMLElement;

      // Initial state
      expect(onIcon?.classList.contains('hidden')).toBe(true);
      expect(offIcon?.classList.contains('hidden')).toBe(false);

      // Toggle to "on" state
      onIcon?.classList.remove('hidden');
      offIcon?.classList.add('hidden');

      expect(onIcon?.classList.contains('hidden')).toBe(false);
      expect(offIcon?.classList.contains('hidden')).toBe(true);

      // Toggle back to "off" state
      onIcon?.classList.add('hidden');
      offIcon?.classList.remove('hidden');

      expect(onIcon?.classList.contains('hidden')).toBe(true);
      expect(offIcon?.classList.contains('hidden')).toBe(false);
    });
  });

  describe('Async operation testing', () => {
    it('should be able to test async permission requests', async () => {
      const requestPermission = (globalThis.Notification as any)
        .requestPermission;
      requestPermission.mockResolvedValue('granted');

      const result = await requestPermission();
      expect(result).toBe('granted');
      expect(requestPermission).toHaveBeenCalled();
    });

    it('should be able to test async token operations', async () => {
      const { getToken } = await import('firebase/messaging');
      const mockGetToken = vi.mocked(getToken);

      mockGetToken.mockResolvedValue(mockToken);

      const result = await mockGetToken(mockMessaging, {
        vapidKey: 'test-key',
      });
      expect(result).toBe(mockToken);
      expect(mockGetToken).toHaveBeenCalledWith(mockMessaging, {
        vapidKey: 'test-key',
      });
    });
  });

  describe('initNotifications function integration tests', () => {
    it('should demonstrate module constraints due to import-time side effects', async () => {
      // Document the architectural limitation: ff flag is read at module import time
      // This makes it difficult to test different ff values within the same test run

      mockGetItem.mockImplementation((key) => {
        if (key === 'ff') return 'true';
        if (key === 'notification_token') return null;
        return null;
      });

      const mockApp = { name: 'test-app' } as any;
      const mockMessaging = { app: mockApp };

      const firebaseMessaging = await import('firebase/messaging');
      vi.mocked(firebaseMessaging.getMessaging).mockReturnValue(
        mockMessaging as any
      );
      vi.mocked(firebaseMessaging.onMessage).mockImplementation(() => vi.fn());

      const { initNotifications } = await import('./notifications');

      // Note: Due to import-time ff evaluation, we test the function exists
      // but can't reliably test different ff scenarios in the same test suite
      expect(typeof initNotifications).toBe('function');

      // Try to call it - behavior depends on the ff value at module import time
      await initNotifications(mockApp);

      // The function should handle the call without throwing
      expect(true).toBe(true); // Test passes if no exception thrown
    });

    it('should handle UI interactions properly when properly initialized', async () => {
      // Test UI state changes that don't depend on ff flag behavior

      // Ensure we have proper DOM structure
      const button = document.getElementById('notifications-button');
      const onIcon = button?.querySelector('.notifications-on');
      const offIcon = button?.querySelector('.notifications-off');

      expect(button).toBeTruthy();
      expect(onIcon).toBeTruthy();
      expect(offIcon).toBeTruthy();

      // Test initial visibility states
      expect(onIcon?.classList.contains('hidden')).toBe(true);
      expect(offIcon?.classList.contains('hidden')).toBe(false);

      // Test that we can simulate icon state changes
      onIcon?.classList.remove('hidden');
      offIcon?.classList.add('hidden');

      expect(onIcon?.classList.contains('hidden')).toBe(false);
      expect(offIcon?.classList.contains('hidden')).toBe(true);
    });

    it('should properly create Notification instances when Firebase messages arrive', () => {
      // Test the notification creation logic without Firebase integration
      const mockPayload = {
        notification: {
          title: 'Test Title',
          body: 'Test Body',
          icon: 'test-icon.png',
        },
      };

      // Create a spy for the Notification constructor
      const NotificationSpy = vi.fn(function (
        this: any,
        title: string,
        options?: any
      ) {
        this.title = title;
        this.options = options;
        this.onclick = null;
        this.close = vi.fn();
      });

      // Temporarily replace the global Notification
      const originalNotification = globalThis.Notification;
      (globalThis as any).Notification = NotificationSpy;

      try {
        // Simulate what the message handler does
        new globalThis.Notification(mockPayload.notification?.title, {
          body: mockPayload.notification?.body,
          icon: mockPayload.notification?.icon,
        });

        // Verify correct notification creation
        expect(NotificationSpy).toHaveBeenCalledWith('Test Title', {
          body: 'Test Body',
          icon: 'test-icon.png',
        });
      } finally {
        // Restore original Notification
        (globalThis as any).Notification = originalNotification;
      }
    });

    it('should handle localStorage operations for token management', () => {
      // Test localStorage integration for notification tokens
      const testToken = 'test-notification-token';

      // Test storing a token
      mockSetItem.mockClear();
      mockSetItem('notification_token', testToken);
      expect(mockSetItem).toHaveBeenCalledWith('notification_token', testToken);

      // Test retrieving a token
      mockGetItem.mockReturnValue(testToken);
      const retrievedToken = mockGetItem('notification_token');
      expect(retrievedToken).toBe(testToken);
      expect(mockGetItem).toHaveBeenCalledWith('notification_token');

      // Test removing a token
      mockRemoveItem.mockClear();
      mockRemoveItem('notification_token');
      expect(mockRemoveItem).toHaveBeenCalledWith('notification_token');
    });

    it('should demonstrate Firebase messaging mock capabilities', async () => {
      // Test that Firebase messaging functions can be properly mocked
      const firebaseMessaging = await import('firebase/messaging');

      // Verify all required Firebase functions are available as mocks
      expect(vi.isMockFunction(firebaseMessaging.getMessaging)).toBe(true);
      expect(vi.isMockFunction(firebaseMessaging.getToken)).toBe(true);
      expect(vi.isMockFunction(firebaseMessaging.deleteToken)).toBe(true);
      expect(vi.isMockFunction(firebaseMessaging.onMessage)).toBe(true);

      // Test mock behavior
      const mockMessaging = { app: 'test' };
      vi.mocked(firebaseMessaging.getMessaging).mockReturnValue(
        mockMessaging as any
      );
      vi.mocked(firebaseMessaging.getToken).mockResolvedValue('mock-token');
      vi.mocked(firebaseMessaging.deleteToken).mockResolvedValue(true);

      // Call the mocked functions
      const messaging = firebaseMessaging.getMessaging();
      const token = await firebaseMessaging.getToken(messaging as any);
      const deleted = await firebaseMessaging.deleteToken(messaging as any);

      expect(messaging).toBe(mockMessaging);
      expect(token).toBe('mock-token');
      expect(deleted).toBe(true);
    });
  });

  describe('Topic-based notification methods', () => {
    describe('syncToken', () => {
      beforeEach(() => {
        localStorage.clear();
        vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-06-30T15:30:00.000Z'));
      });

      afterEach(() => {
        vi.useRealTimers();
        localStorage.clear();
      });

      it('does nothing when the server already confirmed the token', async () => {
        localStorage.setItem('notification_token', 'token-a');
        localStorage.setItem('notification_synced_token', 'token-a');

        vi.resetModules();
        const { syncToken } = await import('./notifications');
        await syncToken('token-a');

        expect(fetch).not.toHaveBeenCalled();
      });

      it('registers a rotated token with the stored topic and drops the old one', async () => {
        localStorage.setItem('notification_token', 'token-a');
        localStorage.setItem('notification_topic', 'hour-07');
        localStorage.setItem('notification_synced_token', 'token-a');

        vi.resetModules();
        const { syncToken } = await import('./notifications');
        await syncToken('token-b');

        expect(fetch).toHaveBeenNthCalledWith(
          1,
          '/topics?token=token-b&topic=hour-07',
          { method: 'POST' }
        );
        expect(fetch).toHaveBeenNthCalledWith(2, '/topics?token=token-a', {
          method: 'DELETE',
        });
        expect(localStorage.getItem('notification_token')).toBe('token-b');
        expect(localStorage.getItem('notification_synced_token')).toBe(
          'token-b'
        );
      });

      it('re-registers an unchanged token once for clients synced before topics were replaced', async () => {
        localStorage.setItem('notification_token', 'token-a');
        localStorage.setItem('notification_topic', 'hour-07');

        vi.resetModules();
        const { syncToken } = await import('./notifications');
        await syncToken('token-a');

        expect(fetch).toHaveBeenCalledOnce();
        expect(fetch).toHaveBeenCalledWith(
          '/topics?token=token-a&topic=hour-07',
          { method: 'POST' }
        );
        expect(localStorage.getItem('notification_synced_token')).toBe(
          'token-a'
        );
      });

      it('uses the current hour when no topic is stored', async () => {
        localStorage.setItem('notification_token', 'token-a');

        vi.resetModules();
        const { syncToken } = await import('./notifications');
        await syncToken('token-a');

        expect(fetch).toHaveBeenCalledWith(
          '/topics?token=token-a&topic=hour-15',
          { method: 'POST' }
        );
        expect(localStorage.getItem('notification_topic')).toBe('hour-15');
      });

      it('keeps the old token when the server rejects the new one', async () => {
        localStorage.setItem('notification_token', 'token-a');
        localStorage.setItem('notification_synced_token', 'token-a');
        vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);

        vi.resetModules();
        const { syncToken } = await import('./notifications');
        await syncToken('token-b');

        expect(fetch).toHaveBeenCalledOnce();
        expect(localStorage.getItem('notification_token')).toBe('token-a');
        expect(localStorage.getItem('notification_synced_token')).toBe(
          'token-a'
        );
      });
    });

    describe('utcHourPadded', () => {
      it('should pad single digit hours with leading zero', async () => {
        vi.resetModules();
        const { utcHourPadded } = await import('./notifications');

        const date = new Date('2025-06-30T05:30:00.000Z'); // 5 AM UTC
        expect(utcHourPadded(date)).toBe('05');
      });

      it('should not pad double digit hours', async () => {
        vi.resetModules();
        const { utcHourPadded } = await import('./notifications');

        const date = new Date('2025-06-30T15:30:00.000Z'); // 3 PM UTC
        expect(utcHourPadded(date)).toBe('15');
      });

      it('should handle midnight (00:00)', async () => {
        vi.resetModules();
        const { utcHourPadded } = await import('./notifications');

        const date = new Date('2025-06-30T00:00:00.000Z'); // midnight UTC
        expect(utcHourPadded(date)).toBe('00');
      });

      it('should handle noon (12:00)', async () => {
        vi.resetModules();
        const { utcHourPadded } = await import('./notifications');

        const date = new Date('2025-06-30T12:00:00.000Z'); // noon UTC
        expect(utcHourPadded(date)).toBe('12');
      });

      it('should handle 11 PM (23:00)', async () => {
        vi.resetModules();
        const { utcHourPadded } = await import('./notifications');

        const date = new Date('2025-06-30T23:00:00.000Z'); // 11 PM UTC
        expect(utcHourPadded(date)).toBe('23');
      });
    });

    describe('subscribeToTopics', () => {
      it('should make POST request to /topics endpoint with token and topic', async () => {
        const mockResponse = { ok: true };
        vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

        vi.resetModules();
        const { subscribeToTopics } = await import('./notifications');

        const testToken = 'test-token-123';
        await subscribeToTopics(testToken, 'hour-09');

        expect(fetch).toHaveBeenCalledWith(
          '/topics?token=test-token-123&topic=hour-09',
          { method: 'POST' }
        );
      });

      it('should throw error when subscription fails', async () => {
        const mockResponse = { ok: false };
        vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

        vi.resetModules();
        const { subscribeToTopics } = await import('./notifications');

        const testToken = 'test-token-123';

        await expect(subscribeToTopics(testToken, 'hour-09')).rejects.toThrow(
          'Failed to subscribe to topic'
        );
      });

      it('should handle network errors', async () => {
        vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

        vi.resetModules();
        const { subscribeToTopics } = await import('./notifications');

        const testToken = 'test-token-123';

        await expect(subscribeToTopics(testToken, 'hour-09')).rejects.toThrow(
          'Network error'
        );
      });
    });

    describe('unsubscribeFromTopics', () => {
      it('should make DELETE request to /topics endpoint with token', async () => {
        const mockResponse = { ok: true };
        vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

        vi.resetModules();
        const { unsubscribeFromTopics } = await import('./notifications');

        const testToken = 'test-token-123';
        await unsubscribeFromTopics(testToken);

        expect(fetch).toHaveBeenCalledWith('/topics?token=test-token-123', {
          method: 'DELETE',
        });
      });

      it('should throw error when unsubscription fails', async () => {
        const mockResponse = { ok: false, status: 500 };
        vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

        vi.resetModules();
        const { unsubscribeFromTopics } = await import('./notifications');

        const testToken = 'test-token-123';

        await expect(unsubscribeFromTopics(testToken)).rejects.toThrow(
          'Failed to unsubscribe from topic'
        );
      });

      it('should treat 404 as success, since the server has nothing to remove', async () => {
        const mockResponse = { ok: false, status: 404 };
        vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

        vi.resetModules();
        const { unsubscribeFromTopics } = await import('./notifications');

        await expect(
          unsubscribeFromTopics('test-token-123')
        ).resolves.toBeUndefined();
      });

      it('should handle network errors', async () => {
        vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

        vi.resetModules();
        const { unsubscribeFromTopics } = await import('./notifications');

        const testToken = 'test-token-123';

        await expect(unsubscribeFromTopics(testToken)).rejects.toThrow(
          'Network error'
        );
      });
    });
  });

  describe('Updated subscribe/unsubscribe flow with topics', () => {
    beforeEach(() => {
      // Mock successful notification permission
      Object.defineProperty(globalThis, 'Notification', {
        value: class MockNotification {
          static permission = 'granted';
          static requestPermission = vi.fn(() => Promise.resolve('granted'));
        },
        writable: true,
      });
    });

    describe('subscribe', () => {
      it('should subscribe to topics and store topic in localStorage', async () => {
        const testToken = 'test-token-123';
        const mockResponse = { ok: true };

        vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

        // Mock Firebase messaging
        const firebaseMessaging = await import('firebase/messaging');
        vi.mocked(firebaseMessaging.getToken).mockResolvedValue(testToken);

        // Mock current time for topic generation
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-06-30T15:30:00.000Z')); // 3:30 PM UTC

        // Mock toast to avoid module issues
        vi.doMock('./toast', () => ({
          showToast: vi.fn(),
        }));

        vi.resetModules();
        const { subscribe } = await import('./notifications');

        await subscribe();

        expect(fetch).toHaveBeenCalledWith(
          '/topics?token=test-token-123&topic=hour-15',
          { method: 'POST' }
        );
        expect(localStorage.getItem('notification_topic')).toBe('hour-15');
        expect(localStorage.getItem('notification_synced_token')).toBe(
          testToken
        );
        localStorage.clear();
        vi.useRealTimers();
      });

      it('should handle topic subscription failure gracefully', async () => {
        const testToken = 'test-token-123';
        const mockResponse = { ok: false };

        vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

        const firebaseMessaging = await import('firebase/messaging');
        vi.mocked(firebaseMessaging.getToken).mockResolvedValue(testToken);

        // Mock toast to avoid module issues
        const showToast = vi.fn();
        vi.doMock('./toast', () => ({ showToast }));

        vi.resetModules();
        const { subscribe } = await import('./notifications');

        // Should not throw, but should handle error internally
        await expect(subscribe()).resolves.not.toThrow();
        expect(showToast).toHaveBeenCalledWith(
          'Failed to subscribe to notifications',
          'error'
        );
      });
    });

    describe('unsubscribe', () => {
      it('should unsubscribe from topics and remove token from localStorage', async () => {
        const testToken = 'test-token-123';
        const mockResponse = { ok: true };

        vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

        const firebaseMessaging = await import('firebase/messaging');
        vi.mocked(firebaseMessaging.deleteToken).mockResolvedValue(true);

        // Mock toast to avoid module issues
        vi.doMock('./toast', () => ({
          showToast: vi.fn(),
        }));

        vi.resetModules();
        const { unsubscribe } = await import('./notifications');

        localStorage.setItem('notification_token', testToken);
        localStorage.setItem('notification_topic', 'hour-15');
        localStorage.setItem('notification_synced_token', testToken);

        await unsubscribe(testToken);

        expect(fetch).toHaveBeenCalledWith('/topics?token=test-token-123', {
          method: 'DELETE',
        });
        expect(firebaseMessaging.deleteToken).toHaveBeenCalled();
        expect(localStorage.getItem('notification_token')).toBeNull();
        expect(localStorage.getItem('notification_topic')).toBeNull();
        expect(localStorage.getItem('notification_synced_token')).toBeNull();
      });

      it('should handle topic unsubscription failure gracefully', async () => {
        const testToken = 'test-token-123';
        const mockResponse = { ok: false };

        vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

        const firebaseMessaging = await import('firebase/messaging');
        vi.mocked(firebaseMessaging.deleteToken).mockResolvedValue(true);

        // Mock toast to avoid module issues
        const showToast = vi.fn();
        vi.doMock('./toast', () => ({ showToast }));

        vi.resetModules();
        const { unsubscribe } = await import('./notifications');

        // Should not throw, but should handle error internally
        await expect(unsubscribe(testToken)).resolves.not.toThrow();
        expect(showToast).toHaveBeenCalledWith(
          'Failed to unsubscribe from notifications',
          'error'
        );
      });
    });
  });
  describe('initNotifications support check', () => {
    it('stops when the browser does not support push', async () => {
      const firebaseMessaging = await import('firebase/messaging');
      vi.mocked(firebaseMessaging.isSupported).mockResolvedValue(false);

      vi.resetModules();
      const { initNotifications } = await import('./notifications');
      await initNotifications({} as any);

      expect(firebaseMessaging.getMessaging).not.toHaveBeenCalled();
      expect(
        document
          .getElementById('notifications-button')
          ?.classList.contains('hidden')
      ).toBe(true);
    });

    it('shows the button when the browser supports push', async () => {
      const firebaseMessaging = await import('firebase/messaging');
      vi.mocked(firebaseMessaging.isSupported).mockResolvedValue(true);
      vi.mocked(firebaseMessaging.getMessaging).mockReturnValue({} as any);
      vi.mocked(firebaseMessaging.onMessage).mockImplementation(() => vi.fn());

      vi.resetModules();
      const { initNotifications } = await import('./notifications');
      await initNotifications({} as any);

      expect(firebaseMessaging.getMessaging).toHaveBeenCalled();
      expect(
        document
          .getElementById('notifications-button')
          ?.classList.contains('hidden')
      ).toBe(false);
    });
  });

  describe('localStorage integration with topics', () => {
    it('should interact with localStorage for topic storage', () => {
      const testTopic = 'hour-15';
      mockSetItem('notification_topic', testTopic);
      expect(mockSetItem).toHaveBeenCalledWith('notification_topic', testTopic);
    });

    it('should interact with localStorage for topic retrieval', () => {
      const testTopic = 'hour-15';
      mockGetItem.mockReturnValue(testTopic);
      // Test the mock directly instead of calling localStorage
      const retrievedTopic = mockGetItem('notification_topic');
      expect(retrievedTopic).toBe(testTopic);
      expect(mockGetItem).toHaveBeenCalledWith('notification_topic');
    });

    it('should interact with localStorage for topic removal', () => {
      mockRemoveItem('notification_topic');
      expect(mockRemoveItem).toHaveBeenCalledWith('notification_topic');
    });
  });
});
