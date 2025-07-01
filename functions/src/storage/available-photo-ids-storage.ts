import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
let app: App;
if (getApps().length === 0) {
  app = initializeApp();
} else {
  app = getApps()[0];
}

const db: Firestore = getFirestore(app);
const COLLECTION_NAME = 'available-photo-ids';

/**
 * Get up to 10 available photo IDs
 * @returns Promise<string[]> - Array of up to 10 available photo IDs
 */
export async function getNextAvailablePhotoIds(
  limit: number
): Promise<string[]> {
  const snapshot = await db.collection(COLLECTION_NAME).limit(limit).get();
  return snapshot.docs.map((doc) => doc.id);
}

/**
 * Remove a photo ID from the available photo IDs collection
 * @param photoId - The photo ID to remove from available list
 * @returns Promise<void>
 */
export async function removeAvailablePhotoId(photoId: string): Promise<void> {
  await db.collection(COLLECTION_NAME).doc(photoId).delete();
}

/**
 * Store multiple available photo IDs in a batch operation
 * @param photoIds - Array of photo IDs to store as available
 * @returns Promise<void>
 */
export async function storeMultipleAvailablePhotoIds(
  photoIds: string[]
): Promise<void> {
  const batch = db.batch();

  photoIds.forEach((photoId) => {
    const docRef = db.collection(COLLECTION_NAME).doc(photoId);
    batch.set(docRef, {});
  });

  await batch.commit();
}

/**
 * Store an available photo ID with an empty object value
 * @param photoId - The photo ID to store as available
 * @returns Promise<void>
 */
export async function storeAvailablePhotoId(photoId: string): Promise<void> {
  await db.collection(COLLECTION_NAME).doc(photoId).set({});
}
