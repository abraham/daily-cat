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

const TOKEN_KEY = 'notification_token';
const TOPIC_KEY = 'notification_topic';
// The token the server last confirmed. Differs from the current token after FCM rotates it.
const SYNCED_TOKEN_KEY = 'notification_synced_token';

const localToken = () => {
  console.log('Getting local token');
  const value = localStorage.getItem(TOKEN_KEY);
  console.log(value);
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
  if (!(await isSupported())) {
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
  await showSubscriptionStatus();
  notificationsButton.addEventListener('click', onNotificationsButtonClick);
};

const showSubscriptionStatus = async () => {
  if (await isSubscribed()) {
    showNotificationsOn();
    return;
  }
  setTimeout(async () => {
    // Chrome mobile randomly shows default instead of granted.
    console.log('Checking subscription status after 100ms');
    if (await isSubscribed()) {
      showNotificationsOn();
    }
  }, 100);
};

const onNotificationsButtonClick = async () => {
  const token = localToken();
  if (!isGranted() || !token) {
    await subscribe();
  } else {
    await unsubscribe(token);
  }
  console.log('Notifications button clicked');
  console.log('permission', Notification.permission);
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
  await syncToken(token);

  return true;
};

const utcHourPadded = (date: Date): string => {
  return date.getUTCHours().toString().padStart(2, '0');
};

const currentHourTopic = () => `hour-${utcHourPadded(new Date())}`;

// Registers the current token with the server if the server hasn't confirmed it yet:
// after FCM rotates the token, and once for clients from before topics were replaced.
const syncToken = async (token: string) => {
  if (localStorage.getItem(SYNCED_TOKEN_KEY) === token) {
    return;
  }

  const previousToken = localToken();
  const topic = localStorage.getItem(TOPIC_KEY) ?? currentHourTopic();
  try {
    await subscribeToTopics(token, topic);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOPIC_KEY, topic);
    localStorage.setItem(SYNCED_TOKEN_KEY, token);

    if (previousToken && previousToken !== token) {
      await unsubscribeFromTopics(previousToken);
    }
  } catch (error) {
    console.error('Error syncing notification token:', error);
  }
};

const subscribeToTopics = async (token: string, topic: string) => {
  console.log(`Subscribing to topic ${topic}`);
  const response = await fetch(
    `/topics?${new URLSearchParams({ token, topic })}`,
    { method: 'POST' }
  );

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

  // 404 means the server has no record of the token, which is the goal anyway.
  if (!response.ok && response.status !== 404) {
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
      const topic = currentHourTopic();
      await subscribeToTopics(token, topic);
      console.log('token', token);
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(TOPIC_KEY, topic);
      localStorage.setItem(SYNCED_TOKEN_KEY, token);
      showNotificationsOn();

      showToast(`Subscribed to daily notifications.`, 'success');
    } else {
      showToast('Notifications permission denied', 'info');
    }
  } catch (error) {
    console.error('Error:', error);
    showToast('Failed to subscribe to notifications', 'error');
  }
};

const unsubscribe = async (token: string) => {
  console.log('Unsubscribing from notifications...');
  try {
    await unsubscribeFromTopics(token);
    await deleteToken(messaging);
    console.log('Token deleted successfully');
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOPIC_KEY);
    localStorage.removeItem(SYNCED_TOKEN_KEY);
    showNotificationsOff();

    showToast('Unsubscribed from daily notifications', 'info');
  } catch (error) {
    console.error('Error unsubscribing from notifications:', error);
    showToast('Failed to unsubscribe from notifications', 'error');
  }
};

// Export internal functions for testing
export {
  subscribe,
  unsubscribe,
  listen,
  subscribeToTopics,
  unsubscribeFromTopics,
  utcHourPadded,
  syncToken,
  showSubscriptionStatus,
  onNotificationsButtonClick,
};
