import { FirebaseApp } from 'firebase/app';
import {
  deleteToken,
  getMessaging,
  getToken,
  Messaging,
  onMessage,
  isSupported,
} from 'firebase/messaging';
import { showToast } from './toast';

// Function to calculate hours until next notification at 00:15 GMT
const getHoursUntilNextNotification = (): number => {
  const now = new Date();

  // Create next notification time (00:15 GMT) - use current date as starting point
  const nextNotification = new Date(now);
  nextNotification.setUTCHours(0, 15, 0, 0);

  // If we've already passed 00:15 GMT today, set it for tomorrow
  if (now >= nextNotification) {
    nextNotification.setUTCDate(nextNotification.getUTCDate() + 1);
  }

  // Calculate hours difference
  const timeDiff = nextNotification.getTime() - now.getTime();
  return Math.ceil(timeDiff / (1000 * 60 * 60)); // Convert to hours and round up
};

const localToken = () => {
  console.log('Getting local token');
  const value = localStorage.getItem('notification_token');
  console.log(value);
  return value;
};

const hasTopic = (): boolean => {
  const value = localStorage.getItem('notification_topic');
  console.log('hasTopic', value);
  return !!value;
};

// TODO: Delete this after July 2025
const shouldUpgradeToTopic = () => {
  const value = hasLocalToken() && !hasTopic();
  console.log('shouldUpgradeToTopic', value);
  return value;
};

const notificationsButton = document.getElementById('notifications-button');
const notificationsOn = notificationsButton?.querySelector('.notifications-on');
const notificationsOff =
  notificationsButton?.querySelector('.notifications-off');

const isGranted = () => {
  const value = Notification.permission === 'granted';
  console.log(`isGranted on ${location.host}`, value);
  console.log('Notification permission:', Notification.permission);
  return value;
};
const hasLocalToken = () => {
  const value = !!localToken();
  console.log('hasLocalToken', value);
  return value;
};

const showNotificationButton = () => {
  if (notificationsButton) {
    notificationsButton.classList.remove('hidden');
  }
};

const showNotificationsOn = () => {
  notificationsOn?.classList.remove('hidden');
  notificationsOff?.classList.add('hidden');
};
const showNotificationsOff = () => {
  notificationsOn?.classList.add('hidden');
  notificationsOff?.classList.remove('hidden');
};

const vapidKey =
  'BNtBpdqelkS4eJuJ1crRVYaPEkf_Ksr11Nm_nKjNLMNl6L9aDsIALPyxNdzjdj4WKzrMjP1ChuNs3AMd_Sb8XzA';
let messaging: Messaging;

export const initNotifications = async (app: FirebaseApp) => {
  if (!isSupported()) {
    console.warn('This browser does not support notifications.');
    return;
  }

  if (!notificationsButton) {
    console.warn('Notifications button not found in the DOM.');
    return;
  }

  messaging = getMessaging(app);
  listen(messaging);

  showNotificationButton();

  if (await isSubscribed()) {
    showNotificationsOn();
    if (shouldUpgradeToTopic()) {
      await subscribe();
      console.log('Upgraded to topic subscription');
    }
  } else {
    setTimeout(async () => {
      // Chrome mobile randomly shows default instead of granted.
      console.log('Checking subscription status after 100ms');
      if (await isSubscribed()) {
        showNotificationsOn();
      }
    }, 100);
  }

  notificationsButton.addEventListener('click', async () => {
    const token = localToken();
    if (!isGranted() || !localToken()) {
      await subscribe();
    } else {
      await unsubscribe(token!);
    }
    console.log('Notifications button clicked');
    console.log('permission', Notification.permission);
  });
};

const listen = (messaging: Messaging) => {
  console.log('Listening for messages...');
  onMessage(messaging, async (payload) => {
    console.log('[fg] Message received. ', payload);
    navigator.serviceWorker.ready.then((registration) => {
      console.log('Notification displaying');
      registration.showNotification(payload.notification!.title!, {
        body: payload.notification?.body,
        icon: payload.notification?.icon,
      });
      console.log('Notification displayed');
    });
  });
};

const isSubscribed = async (): Promise<boolean> => {
  console.log('Checking if subscribed to notifications...');
  if (!isGranted()) {
    return false;
  }

  if (!hasLocalToken()) {
    return false;
  }

  console.log('Updating token');
  const token = await getToken(messaging, { vapidKey });
  console.log(token);
  localStorage.setItem('notification_token', token);

  return true;
};

const utcHourPadded = (date: Date): string => {
  return date.getUTCHours().toString().padStart(2, '0');
};

const subscribeToTopics = async (token: string) => {
  console.log(`Subscribing to topic`);
  const response = await fetch(`/topics?${new URLSearchParams({ token })}`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Failed to subscribe to topic`);
  }

  console.log(`Subscribed to topic successfully`);
};

const unsubscribeFromTopics = async (token: string) => {
  console.log(`Unsubscribing from topic`);
  const response = await fetch(`/topics?${new URLSearchParams({ token })}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to unsubscribe from topic`);
  }

  console.log(`Unsubscribed from topic successfully`);
};

const subscribe = async () => {
  console.log('Subscribing to notifications...');
  try {
    await Notification.requestPermission();
    if (isGranted()) {
      const token = await getToken(messaging, { vapidKey });
      await subscribeToTopics(token);
      console.log('token', token);
      localStorage.setItem('notification_token', token);
      localStorage.setItem(
        'notification_topic',
        `hour-${utcHourPadded(new Date())}`
      );
      showNotificationsOn();

      showToast(`Subscribed to daily notifications.`, 'success');
    } else {
      showToast('Notifications permission denied', 'info');
    }
  } catch (error) {
    console.error('Error:', error);
    showToast('Failed to subscribe to notifications', 'info');
  }
};

const unsubscribe = async (token: string) => {
  console.log('Unsubscribing from notifications...');
  try {
    await unsubscribeFromTopics(token);
    await deleteToken(messaging);
    console.log('Token deleted successfully');
    localStorage.removeItem('notification_token');
    showNotificationsOff();

    showToast('Unsubscribed from daily notifications', 'info');
  } catch (error) {
    console.error('Error unsubscribing from notifications:', error);
    showToast('Failed to unsubscribe from notifications', 'info');
  }
};

// Export internal functions for testing
export {
  subscribe,
  unsubscribe,
  listen,
  getHoursUntilNextNotification,
  subscribeToTopics,
  unsubscribeFromTopics,
  utcHourPadded,
  hasTopic,
  shouldUpgradeToTopic,
};
