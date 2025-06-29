console.log('Daily Cat app initialized');

import { initializeApp } from 'firebase/app';
import { initNotifications } from './notifications';

fetch('/__/firebase/init.json').then(async (response) => {
  const app = initializeApp(await response.json());

  initNotifications(app);
});
