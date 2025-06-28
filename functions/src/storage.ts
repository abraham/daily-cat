import { initializeApp, getApps, App } from 'firebase-admin/app';
import {
  getFirestore,
  Firestore,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import { UnsplashPhoto } from './types';

// Initialize Firebase Admin if not already initialized
let app: App;
if (getApps().length === 0) {
  app = initializeApp();
} else {
  app = getApps()[0];
}

const db: Firestore = getFirestore(app);
const COLLECTION_NAME = 'days';

export interface DayRecord {
  id: string; // ISO date string (YYYY-MM-DD) - same as date, used as document ID
  date: string; // ISO date string (YYYY-MM-DD)
  photo: UnsplashPhoto;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Save an UnsplashPhoto to the 'days' collection for a specific date
 * @param date - ISO date string (YYYY-MM-DD)
 * @param photo - UnsplashPhoto object to store
 * @returns Promise<string> - Document ID of the saved record (same as date)
 */
export async function savePhotoForDate(
  date: string,
  photo: UnsplashPhoto
): Promise<string> {
  const now = new Date();
  const dayRecord: Omit<DayRecord, 'id'> = {
    date,
    photo,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection(COLLECTION_NAME).doc(date).set(dayRecord);
  return date;
}

/**
 * Get the UnsplashPhoto for a specific date
 * @param date - ISO date string (YYYY-MM-DD)
 * @returns Promise<DayRecord | null> - The day record or null if not found
 */
export async function getPhotoForDate(date: string): Promise<DayRecord | null> {
  const doc = await db.collection(COLLECTION_NAME).doc(date).get();

  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...doc.data(),
  } as DayRecord;
}

/**
 * Update an existing day record with a new photo
 * @param date - ISO date string (YYYY-MM-DD) - used as document ID
 * @param photo - New UnsplashPhoto object
 * @returns Promise<void>
 */
export async function updatePhotoForDay(
  date: string,
  photo: UnsplashPhoto
): Promise<void> {
  const now = new Date();
  await db.collection(COLLECTION_NAME).doc(date).update({
    photo,
    updatedAt: now,
  });
}

/**
 * Get photos for a date range
 * @param startDate - Start date (ISO string, YYYY-MM-DD)
 * @param endDate - End date (ISO string, YYYY-MM-DD)
 * @returns Promise<DayRecord[]> - Array of day records
 */
export async function getPhotosForDateRange(
  startDate: string,
  endDate: string
): Promise<DayRecord[]> {
  const snapshot = await db
    .collection(COLLECTION_NAME)
    .where('date', '>=', startDate)
    .where('date', '<=', endDate)
    .orderBy('date', 'asc')
    .get();

  return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
    id: doc.id,
    ...doc.data(),
  })) as DayRecord[];
}

/**
 * Delete a day record
 * @param date - ISO date string (YYYY-MM-DD) - used as document ID
 * @returns Promise<void>
 */
export async function deleteDayRecord(date: string): Promise<void> {
  await db.collection(COLLECTION_NAME).doc(date).delete();
}

/**
 * Check if a photo exists for a specific date
 * @param date - ISO date string (YYYY-MM-DD)
 * @returns Promise<boolean> - True if a photo exists for the date
 */
export async function hasPhotoForDate(date: string): Promise<boolean> {
  const doc = await db.collection(COLLECTION_NAME).doc(date).get();
  return doc.exists;
}

/**
 * Get the most recent day record
 * @returns Promise<DayRecord | null> - The most recent day record or null if none exist
 */
export async function getMostRecentPhoto(): Promise<DayRecord | null> {
  const snapshot = await db
    .collection(COLLECTION_NAME)
    .orderBy('date', 'desc')
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as DayRecord;
}
