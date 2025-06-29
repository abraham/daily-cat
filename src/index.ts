console.log('Daily Cat app initialized');

import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging';

fetch('/__/firebase/init.json').then(async (response) => {
  const app = initializeApp(await response.json());
  const messaging = getMessaging(app);
  console.log('Firebase app initialized:', app.name);
  console.log('Firebase Messaging initialized:', messaging);
});
