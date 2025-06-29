/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

fetch('/__/firebase/init.json').then(async (response) => {
  const app = initializeApp(await response.json());

  const messaging = getMessaging(app);
  onBackgroundMessage(messaging, (payload) => {
    console.log(
      '[firebase-messaging-sw.js] Received background message ',
      payload
    );

    const notificationTitle = 'Background Message Title';
    const notificationOptions = {
      body: 'Background Message body.',
      icon: '/firebase-logo.png',
    };

    // Cast self to ServiceWorkerGlobalScope to access registration
    self.registration.showNotification(notificationTitle, notificationOptions);
  });
});
