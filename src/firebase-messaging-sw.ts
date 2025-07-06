/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging/sw';
import { firebaseConfig } from './config';

const app = initializeApp(firebaseConfig);
getMessaging(app);
