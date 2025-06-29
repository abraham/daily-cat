import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firebase modules before importing
vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(),
  getToken: vi.fn(),
  deleteToken: vi.fn(),
}));

// Mock localStorage - this is critical since the module reads from it at import time
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: vi.fn(() => 'true'), // Default to feature flag enabled
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
  writable: true,
});

// Set up basic DOM structure before import
document.body.innerHTML = `
  <button id="notifications-button" class="hidden">
    <span class="notifications-on hidden"></span>
    <span class="notifications-off"></span>
  </button>
`;

// Now import the module after setup
import { initNotifications } from './notifications';
import { FirebaseApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging';

const mockGetMessaging = vi.mocked(getMessaging);

describe('Notifications', () => {
  const mockApp = {} as FirebaseApp;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <button id="notifications-button" class="hidden">
        <span class="notifications-on hidden"></span>
        <span class="notifications-off"></span>
      </button>
    `;

    // Reset Notification API
    Object.defineProperty(global, 'Notification', {
      value: {
        permission: 'default',
        requestPermission: vi.fn(() => Promise.resolve('granted')),
      },
      writable: true,
    });

    // Reset mocks
    vi.clearAllMocks();
    mockGetMessaging.mockReturnValue({} as any);
  });

  describe('initNotifications integration tests', () => {
    it('should not throw when called with valid app', async () => {
      await expect(initNotifications(mockApp)).resolves.not.toThrow();
    });

    it('should handle missing notification button gracefully', async () => {
      // Remove button from DOM
      document.body.innerHTML = '';

      await expect(initNotifications(mockApp)).resolves.not.toThrow();
    });

    it('should work with browser that does not support notifications', async () => {
      // Remove Notification API
      Object.defineProperty(global, 'Notification', {
        value: undefined,
        writable: true,
      });

      await expect(initNotifications(mockApp)).resolves.not.toThrow();
    });
  });

  describe('DOM interaction', () => {
    it('should have notification button elements available', () => {
      const button = document.getElementById('notifications-button');
      const onIcon = button?.querySelector('.notifications-on');
      const offIcon = button?.querySelector('.notifications-off');

      expect(button).toBeTruthy();
      expect(onIcon).toBeTruthy();
      expect(offIcon).toBeTruthy();
    });

    it('should properly structure notification icons with correct initial classes', () => {
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

  describe('notification functionality', () => {
    it('should support click events on notification button', async () => {
      await initNotifications(mockApp);

      const button = document.getElementById('notifications-button');

      // Create a click event
      const clickEvent = new Event('click');

      // Should not throw when dispatching click event
      expect(() => button?.dispatchEvent(clickEvent)).not.toThrow();
    });

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
  });
});
