import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { Config } from './config';
import { getApp } from './firebase';

const db: Firestore = getFirestore(getApp());

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

/**
 * Update the configuration document in Firestore. `lastPage` only moves through advanceLastPage().
 * @param config - Partial configuration object with fields to update
 * @returns Promise<void>
 * @throws Error if the update operation fails
 */
export async function updateConfig(
  config: Partial<Omit<Config, 'lastPage'>>
): Promise<void> {
  await db.collection('config').doc('config').update(config);
}

/**
 * Record that a search page was fetched. In a transaction, moves `lastPage` past `page`
 * but never backwards, so concurrent callers can't undo each other's progress.
 * @param page - The search page that was just fetched
 * @returns Promise<string> - The new `lastPage`, which is the next page to fetch
 */
export async function advanceLastPage(page: string): Promise<string> {
  const ref = db.collection('config').doc('config');

  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(ref);
    if (!doc.exists) {
      throw new Error('Configuration document not found at config/config');
    }

    const current = Number((doc.data() as Config).lastPage);
    const next = Math.max(current, Number(page) + 1).toString();
    transaction.update(ref, { lastPage: next });
    return next;
  });
}
