import { FirebaseApp } from 'firebase/app';
import {
  deleteToken,
  getMessaging,
  getToken,
  Messaging,
  onMessage,
} from 'firebase/messaging';

let token: string | null = null;
const vapidKey =
  'BNtBpdqelkS4eJuJ1crRVYaPEkf_Ksr11Nm_nKjNLMNl6L9aDsIALPyxNdzjdj4WKzrMjP1ChuNs3AMd_Sb8XzA';
let messaging: Messaging;
const ff = localStorage.getItem('ff') === 'true';

const notificationsButton = document.getElementById('notifications-button');
const notificationsOn = notificationsButton?.querySelector('.notifications-on');
const notificationsOff =
  notificationsButton?.querySelector('.notifications-off');

export const initNotifications = async (app: FirebaseApp) => {
  if (!ff) {
    console.warn('Notifications are disabled in this build.');
    return;
  }
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

    if (granted) {
      token = localStorage.getItem('notification_token');
    }

    if (token) {
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
    console.log('Message received. ', payload);
  });
};

const subscribe = async () => {
  console.log('Subscribing to notifications...');
  try {
    const permission = await Notification.requestPermission();
    console.log('permission', permission);
    token = await getToken(messaging, { vapidKey });
    console.log('token', token);
    localStorage.setItem('notification_token', token);
    notificationsOn?.classList.remove('hidden');
    notificationsOff?.classList.add('hidden');
  } catch (error) {
    console.error('Error requesting notification permission:', error);
  }
};

const unsubscribe = async () => {
  console.log('Unsubscribing from notifications...');
  if (token) {
    await deleteToken(messaging);
    console.log('Token deleted successfully');
    token = null;
    localStorage.removeItem('notification_token');
    notificationsOn?.classList.add('hidden');
    notificationsOff?.classList.remove('hidden');
  }
};
