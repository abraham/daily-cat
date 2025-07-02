import { FirebaseApp } from 'firebase/app';
import {
  deleteToken,
  getMessaging,
  getToken,
  Messaging,
  onMessage,
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

let token: string | null = null;
const vapidKey =
  'BNtBpdqelkS4eJuJ1crRVYaPEkf_Ksr11Nm_nKjNLMNl6L9aDsIALPyxNdzjdj4WKzrMjP1ChuNs3AMd_Sb8XzA';
let messaging: Messaging;

const notificationsButton = document.getElementById('notifications-button');
const notificationsOn = notificationsButton?.querySelector('.notifications-on');
const notificationsOff =
  notificationsButton?.querySelector('.notifications-off');

export const initNotifications = async (app: FirebaseApp) => {
  const browserSupportsNotifications = 'Notification' in window;
  if (!browserSupportsNotifications) {
    console.warn('This browser does not support notifications.');
    return;
  }

  messaging = getMessaging(app);
  listen(messaging);
  const granted = Notification.permission === 'granted';
  console.log('granted', granted);
  if (granted) {
    console.log('Notifications are already granted.');
    token = localStorage.getItem('notification_token');
    console.log('token', token);
  }
  const notificationsButton = document.getElementById('notifications-button');
  if (notificationsButton) {
    notificationsButton.classList.remove('hidden');

    if (await subscribed()) {
      notificationsOn?.classList.toggle('hidden');
      notificationsOff?.classList.toggle('hidden');
    }

    notificationsButton.addEventListener('click', async () => {
      if (Notification.permission !== 'granted' || !token) {
        await subscribe();
      } else {
        await unsubscribe();
      }
      console.log('Notifications button clicked');
      console.log('permission', Notification.permission);
    });
  }
};

const listen = (messaging: Messaging) => {
  console.log('Listening for messages...');
  onMessage(messaging, (payload) => {
    console.log('[fg] Message received. ', payload);
    const notification = new Notification(payload.notification!.title!, {
      body: payload.notification?.body,
      icon: payload.notification?.icon,
    });

    notification.onclick = () => {
      console.log('[fg] Notification clicked:', payload);
      window.focus();
      notification.close();
    };
  });
};

const subscribed = async (): Promise<boolean> => {
  let enabled = false;
  const permission = await Notification.requestPermission();
  if (
    permission === 'granted' &&
    !!localStorage.getItem('notification_token')
  ) {
    const token = await getToken(messaging, { vapidKey });
    console.log('token', token);
    localStorage.setItem('notification_token', token);
    enabled = !!token;
  }
  console.log('Notifications enabled:', enabled);
  return enabled;
};

const subscribe = async () => {
  console.log('Subscribing to notifications...');
  try {
    const permission = await Notification.requestPermission();
    console.log('permission', permission);

    if (permission === 'granted') {
      token = await getToken(messaging, { vapidKey });
      console.log('token', token);
      localStorage.setItem('notification_token', token);
      notificationsOn?.classList.remove('hidden');
      notificationsOff?.classList.add('hidden');

      const hoursUntilNext = getHoursUntilNextNotification();
      const hoursText = hoursUntilNext === 1 ? 'hour' : 'hours';
      showToast(
        `Subscribed to daily notifications. Next push in ${hoursUntilNext} ${hoursText}`,
        'success'
      );
    } else {
      showToast('Notifications permission denied', 'info');
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    showToast('Failed to subscribe to notifications', 'info');
  }
};

const unsubscribe = async () => {
  console.log('Unsubscribing from notifications...');
  if (token) {
    try {
      await deleteToken(messaging);
      console.log('Token deleted successfully');
      token = null;
      localStorage.removeItem('notification_token');
      notificationsOn?.classList.add('hidden');
      notificationsOff?.classList.remove('hidden');

      showToast('Unsubscribed from daily notifications', 'info');
    } catch (error) {
      console.error('Error unsubscribing from notifications:', error);
      showToast('Failed to unsubscribe from notifications', 'info');
    }
  }
};

// Export internal functions for testing
export { subscribe, unsubscribe, listen, getHoursUntilNextNotification };
