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
const COLLECTION_NAME = 'photo-ids';

/**
 * Store a photo ID with an empty object value to track used photo IDs
 * @param photoId - The photo ID to store
 * @returns Promise<void>
 */
export async function storePhotoId(photoId: string): Promise<void> {
  await db.collection(COLLECTION_NAME).doc(photoId).set({});
}

/**
 * Check if a photo ID has been used (exists in the collection)
 * @param photoId - The photo ID to check
 * @returns Promise<boolean> - True if the photo ID exists, false otherwise
 */
export async function isPhotoIdUsed(photoId: string): Promise<boolean> {
  const doc = await db.collection(COLLECTION_NAME).doc(photoId).get();
  return doc.exists;
}

/**
 * Get all used photo IDs
 * @returns Promise<string[]> - Array of all used photo IDs
 */
export async function getAllUsedPhotoIds(): Promise<string[]> {
  const snapshot = await db.collection(COLLECTION_NAME).get();
  return snapshot.docs.map((doc) => doc.id);
}

/**
 * Delete a photo ID from the used photo IDs collection
 * @param photoId - The photo ID to delete
 * @returns Promise<void>
 */
export async function deletePhotoId(photoId: string): Promise<void> {
  await db.collection(COLLECTION_NAME).doc(photoId).delete();
}
