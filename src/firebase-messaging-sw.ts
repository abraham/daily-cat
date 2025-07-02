/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

// This only seems to work in Chrome if it's before the Firebase imports
self.addEventListener('notificationclick', (event) => {
  console.log(
    '[firebase-messaging-sw.js] Received notification click event',
    event
  );
  console.log('[firebase-messaging-sw.js] Opening', self.location.origin);
  event.notification.close();
  event.waitUntil(self.clients.openWindow(self.location.origin));
});

import { initializeApp } from 'firebase/app';
import {
  getMessaging,
  MessagePayload,
  onBackgroundMessage,
} from 'firebase/messaging/sw';
import { firebaseConfig } from './config';

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

const handleMessage = (payload: MessagePayload) => {
  console.log(
    '[firebase-messaging-sw.js] Received background message ',
    payload
  );

  const notificationTitle = payload.notification?.title!;
  const notificationOptions = {
    body: payload.notification?.body,
    icon: payload.notification?.icon,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
};

onBackgroundMessage(messaging, handleMessage);
