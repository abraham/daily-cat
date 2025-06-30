/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

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

self.addEventListener('notificationclick', (event) => {
  console.log(
    '[firebase-messaging-sw.js] Received notification click event',
    event
  );
  event.notification.close();
  event.waitUntil(self.clients.openWindow(self.location.origin));
});
