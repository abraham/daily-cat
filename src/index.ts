console.log('Daily Cat app initialized');

import { initializeApp } from 'firebase/app';
import { initNotifications } from './notifications';
import { firebaseConfig } from './config';

const app = initializeApp(firebaseConfig);

addEventListener('DOMContentLoaded', (_event) => {
  console.log('DOMContentLoaded');
  initNotifications(app);
});
