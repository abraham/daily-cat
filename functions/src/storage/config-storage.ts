import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { Config } from '../types';

// Initialize Firebase Admin if not already initialized
let app: App;
if (getApps().length === 0) {
  app = initializeApp();
} else {
  app = getApps()[0];
}

const db: Firestore = getFirestore(app);

/**
 * Get the configuration document from Firestore
 * @returns Promise<Config> - The configuration object
 * @throws Error if the configuration document is not found
 */
export async function getConfig(): Promise<Config> {
  const doc = await db.collection('config').doc('config').get();

  if (!doc.exists) {
    throw new Error('Configuration document not found at config/config');
  }

  return doc.data() as Config;
}
