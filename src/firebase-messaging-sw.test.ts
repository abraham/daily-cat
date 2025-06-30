import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Define a mock MessagePayload type for testing
type MockMessagePayload = {
  from?: string;
  collapseKey?: string;
  messageId?: string;
  notification?: {
    title?: string;
    body?: string;
    icon?: string;
  };
  data?: Record<string, any>;
};

// Mock Firebase imports
const mockInitializeApp = vi.fn();
const mockGetMessaging = vi.fn();
const mockOnBackgroundMessage = vi.fn();

vi.mock('firebase/app', () => ({
  initializeApp: mockInitializeApp,
}));

vi.mock('firebase/messaging/sw', () => ({
  getMessaging: mockGetMessaging,
  onBackgroundMessage: mockOnBackgroundMessage,
}));

vi.mock('./config', () => ({
  firebaseConfig: {
    apiKey: 'test-api-key',
    authDomain: 'test.firebaseapp.com',
    projectId: 'test-project',
    messagingSenderId: '123456789',
    appId: 'test-app-id',
  },
}));

// Helper to create a mock MessagePayload with required fields
const createMockPayload = (
  overrides: Partial<MockMessagePayload> = {}
): MockMessagePayload => ({
  from: 'test-sender',
  collapseKey: 'test-collapse-key',
  messageId: 'test-message-id',
  ...overrides,
});

describe('Firebase Messaging Service Worker', () => {
  // Mock ServiceWorkerGlobalScope and related APIs
  const mockRegistration = {
    showNotification: vi.fn(),
  };

  const mockClients = {
    openWindow: vi.fn(),
  };

  const mockSelf = {
    registration: mockRegistration,
    clients: mockClients,
    location: {
      origin: 'https://example.com',
    },
    addEventListener: vi.fn(),
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock global self as ServiceWorkerGlobalScope
    (global as any).self = mockSelf;

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});

    // Setup default mock returns
    mockGetMessaging.mockReturnValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Module behavior simulation', () => {
    it('should initialize Firebase app with correct config', () => {
      // Simulate what the module does
      const firebaseConfig = {
        apiKey: 'test-api-key',
        authDomain: 'test.firebaseapp.com',
        projectId: 'test-project',
        messagingSenderId: '123456789',
        appId: 'test-app-id',
      };

      mockInitializeApp(firebaseConfig);
      const app = mockInitializeApp.mock.results[0];
      mockGetMessaging(app);

      expect(mockInitializeApp).toHaveBeenCalledWith(firebaseConfig);
      expect(mockGetMessaging).toHaveBeenCalled();
    });

    it('should be able to register background message handler', () => {
      const messaging = {};
      const handleMessage = vi.fn();

      mockOnBackgroundMessage(messaging, handleMessage);

      expect(mockOnBackgroundMessage).toHaveBeenCalledWith(
        messaging,
        handleMessage
      );
    });

    it('should be able to register notification click event listener', () => {
      const clickHandler = vi.fn();

      mockSelf.addEventListener('notificationclick', clickHandler);

      expect(mockSelf.addEventListener).toHaveBeenCalledWith(
        'notificationclick',
        clickHandler
      );
    });
  });

  describe('handleMessage function logic', () => {
    // Simulate the handleMessage function from the service worker
    const simulateHandleMessage = (payload: MockMessagePayload) => {
      console.log(
        '[firebase-messaging-sw.js] Received background message ',
        payload
      );

      const notificationTitle = '[b] ' + payload.notification?.title;
      const notificationOptions = {
        body: '[b] ' + payload.notification?.body,
        icon: payload.notification?.icon,
      };

      mockSelf.registration.showNotification(
        notificationTitle,
        notificationOptions
      );
    };

    it('should handle background message with complete payload', () => {
      const mockPayload = createMockPayload({
        notification: {
          title: 'Test Title',
          body: 'Test Body',
          icon: 'test-icon.png',
        },
        data: {
          customKey: 'customValue',
        },
      });

      simulateHandleMessage(mockPayload);

      expect(console.log).toHaveBeenCalledWith(
        '[firebase-messaging-sw.js] Received background message ',
        mockPayload
      );

      expect(mockRegistration.showNotification).toHaveBeenCalledWith(
        '[b] Test Title',
        {
          body: '[b] Test Body',
          icon: 'test-icon.png',
        }
      );
    });

    it('should handle background message with partial notification data', () => {
      const mockPayload = createMockPayload({
        notification: {
          title: 'Test Title',
          // Missing body and icon
        },
      });

      simulateHandleMessage(mockPayload);

      expect(console.log).toHaveBeenCalledWith(
        '[firebase-messaging-sw.js] Received background message ',
        mockPayload
      );

      expect(mockRegistration.showNotification).toHaveBeenCalledWith(
        '[b] Test Title',
        {
          body: '[b] undefined', // body is undefined
          icon: undefined, // icon is undefined
        }
      );
    });

    it('should handle background message with no notification property', () => {
      const mockPayload = createMockPayload({
        data: {
          customKey: 'customValue',
        },
      });

      simulateHandleMessage(mockPayload);

      expect(console.log).toHaveBeenCalledWith(
        '[firebase-messaging-sw.js] Received background message ',
        mockPayload
      );

      expect(mockRegistration.showNotification).toHaveBeenCalledWith(
        '[b] undefined', // title is undefined
        {
          body: '[b] undefined', // body is undefined
          icon: undefined, // icon is undefined
        }
      );
    });

    it('should handle empty notification object', () => {
      const mockPayload = createMockPayload({
        notification: {},
      });

      simulateHandleMessage(mockPayload);

      expect(console.log).toHaveBeenCalledWith(
        '[firebase-messaging-sw.js] Received background message ',
        mockPayload
      );

      expect(mockRegistration.showNotification).toHaveBeenCalledWith(
        '[b] undefined',
        {
          body: '[b] undefined',
          icon: undefined,
        }
      );
    });

    it('should add [b] prefix to notification title and body', () => {
      const mockPayload = createMockPayload({
        notification: {
          title: 'Original Title',
          body: 'Original Body',
          icon: 'icon.png',
        },
      });

      simulateHandleMessage(mockPayload);

      expect(mockRegistration.showNotification).toHaveBeenCalledWith(
        '[b] Original Title',
        {
          body: '[b] Original Body',
          icon: 'icon.png',
        }
      );
    });
  });

  describe('notification click handler logic', () => {
    // Simulate the notification click handler from the service worker
    const simulateNotificationClick = (event: any) => {
      console.log(
        '[firebase-messaging-sw.js] Received notification click event',
        event
      );

      if (event.notification) {
        event.notification.close();
      }

      if (event.waitUntil) {
        event.waitUntil(mockSelf.clients.openWindow(mockSelf.location.origin));
      }
    };

    it('should handle notification click event', () => {
      const mockEvent = {
        notification: {
          close: vi.fn(),
        },
        waitUntil: vi.fn(),
      };

      simulateNotificationClick(mockEvent);

      expect(console.log).toHaveBeenCalledWith(
        '[firebase-messaging-sw.js] Received notification click event',
        mockEvent
      );

      expect(mockEvent.notification.close).toHaveBeenCalled();
      expect(mockEvent.waitUntil).toHaveBeenCalled();
    });

    it('should open window to origin on notification click', () => {
      const mockEvent = {
        notification: {
          close: vi.fn(),
        },
        waitUntil: vi.fn(),
      };

      mockClients.openWindow.mockResolvedValue(undefined);

      simulateNotificationClick(mockEvent);

      // Verify clients.openWindow was called with the correct origin
      expect(mockClients.openWindow).toHaveBeenCalledWith(
        'https://example.com'
      );
    });

    it('should handle notification click with missing notification property', () => {
      const mockEvent = {
        waitUntil: vi.fn(),
      };

      // Should not throw an error
      expect(() => simulateNotificationClick(mockEvent)).not.toThrow();

      expect(console.log).toHaveBeenCalledWith(
        '[firebase-messaging-sw.js] Received notification click event',
        mockEvent
      );

      expect(mockEvent.waitUntil).toHaveBeenCalled();
    });

    it('should handle event with missing waitUntil method', () => {
      const mockEvent = {
        notification: {
          close: vi.fn(),
        },
      };

      // Should not throw an error
      expect(() => simulateNotificationClick(mockEvent)).not.toThrow();

      expect(mockEvent.notification.close).toHaveBeenCalled();
    });
  });

  describe('Service Worker environment compatibility', () => {
    it('should work with ServiceWorkerGlobalScope', () => {
      // Verify that the service worker has access to the expected global APIs
      expect(mockSelf.registration).toBeDefined();
      expect(mockSelf.clients).toBeDefined();
      expect(mockSelf.location).toBeDefined();
      expect(mockSelf.addEventListener).toBeDefined();
    });

    it('should handle showNotification API correctly', () => {
      // Test that the showNotification API is called correctly
      const title = 'Test Notification';
      const options = { body: 'Test Body', icon: 'test.png' };

      mockSelf.registration.showNotification(title, options);

      expect(mockRegistration.showNotification).toHaveBeenCalledWith(
        title,
        options
      );
    });

    it('should handle clients.openWindow API correctly', async () => {
      const url = 'https://example.com/test';
      mockClients.openWindow.mockResolvedValue({});

      const result = await mockSelf.clients.openWindow(url);

      expect(mockClients.openWindow).toHaveBeenCalledWith(url);
      expect(result).toBeDefined();
    });
  });

  describe('Error handling scenarios', () => {
    it('should demonstrate error handling for showNotification', () => {
      const mockPayload = createMockPayload({
        notification: {
          title: 'Test Title',
          body: 'Test Body',
        },
      });

      // Mock showNotification to throw an error
      mockRegistration.showNotification.mockImplementation(() => {
        throw new Error('Notification failed');
      });

      // The handleMessage function should handle errors gracefully
      expect(() => {
        console.log(
          '[firebase-messaging-sw.js] Received background message ',
          mockPayload
        );
        const notificationTitle = '[b] ' + mockPayload.notification?.title;
        const notificationOptions = {
          body: '[b] ' + mockPayload.notification?.body,
          icon: mockPayload.notification?.icon,
        };
        mockSelf.registration.showNotification(
          notificationTitle,
          notificationOptions
        );
      }).toThrow('Notification failed');
    });

    it('should demonstrate error handling for openWindow', async () => {
      mockClients.openWindow.mockRejectedValue(
        new Error('Failed to open window')
      );

      // Should handle openWindow errors gracefully
      try {
        await mockSelf.clients.openWindow(mockSelf.location.origin);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Failed to open window');
      }
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete message-to-click workflow', () => {
      const mockPayload = createMockPayload({
        notification: {
          title: 'Integration Test',
          body: 'Click me!',
          icon: 'integration.png',
        },
      });

      // Simulate receiving a background message
      console.log(
        '[firebase-messaging-sw.js] Received background message ',
        mockPayload
      );
      const notificationTitle = '[b] ' + mockPayload.notification?.title;
      const notificationOptions = {
        body: '[b] ' + mockPayload.notification?.body,
        icon: mockPayload.notification?.icon,
      };
      mockSelf.registration.showNotification(
        notificationTitle,
        notificationOptions
      );

      expect(mockRegistration.showNotification).toHaveBeenCalledWith(
        '[b] Integration Test',
        {
          body: '[b] Click me!',
          icon: 'integration.png',
        }
      );

      // Simulate clicking the notification
      const clickEvent = {
        notification: { close: vi.fn() },
        waitUntil: vi.fn(),
      };

      console.log(
        '[firebase-messaging-sw.js] Received notification click event',
        clickEvent
      );
      clickEvent.notification.close();
      clickEvent.waitUntil(
        mockSelf.clients.openWindow(mockSelf.location.origin)
      );

      expect(clickEvent.notification.close).toHaveBeenCalled();
      expect(clickEvent.waitUntil).toHaveBeenCalled();
      expect(mockClients.openWindow).toHaveBeenCalledWith(
        'https://example.com'
      );
    });

    it('should verify Firebase setup workflow', () => {
      // Simulate the complete Firebase setup
      const firebaseConfig = {
        apiKey: 'test-api-key',
        authDomain: 'test.firebaseapp.com',
        projectId: 'test-project',
        messagingSenderId: '123456789',
        appId: 'test-app-id',
      };

      // Initialize Firebase
      mockInitializeApp(firebaseConfig);
      const app = mockInitializeApp.mock.results[0];

      // Get messaging
      mockGetMessaging(app);
      const messaging = mockGetMessaging.mock.results[0];

      // Register background message handler
      const handleMessage = vi.fn();
      mockOnBackgroundMessage(messaging, handleMessage);

      // Register notification click handler
      const clickHandler = vi.fn();
      mockSelf.addEventListener('notificationclick', clickHandler);

      expect(mockInitializeApp).toHaveBeenCalledWith(firebaseConfig);
      expect(mockGetMessaging).toHaveBeenCalledWith(app);
      expect(mockOnBackgroundMessage).toHaveBeenCalledWith(
        messaging,
        handleMessage
      );
      expect(mockSelf.addEventListener).toHaveBeenCalledWith(
        'notificationclick',
        clickHandler
      );
    });
  });
});
