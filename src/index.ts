console.log('Daily Cat app initialized');

import { initializeApp } from 'firebase/app';
import { initNotifications } from './notifications';
import { firebaseConfig } from './config';

const app = initializeApp(firebaseConfig);

initNotifications(app);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('firebase-messaging-sw.js');
}

const urlParams = new URLSearchParams(window.location.search);
const ff = urlParams.get('ff');

if (ff === 'on') {
  localStorage.setItem('ff', 'true');
} else if (ff === 'off') {
  localStorage.removeItem('ff');
}
