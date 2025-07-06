import { App, getApps, initializeApp } from 'firebase-admin/app';
import {
  DocumentData,
  Firestore,
  getFirestore,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import { CompletedDayRecord, DayRecord, NewDayRecord } from '../types/day';
import { UnsplashPhoto } from '../types/unsplash';
import { Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
let app: App;
if (getApps().length === 0) {
  app = initializeApp();
} else {
  app = getApps()[0];
}

const db: Firestore = getFirestore(app);
const COLLECTION_NAME = 'days';

/**
 * Save an UnsplashPhoto to the 'days' collection for a specific date
 * @param id - ISO date string (YYYY-MM-DD)
 * @param photo - UnsplashPhoto object to store
 * @returns Promise<string> - Document ID of the saved record (same as date)
 */
export async function savePhotoForDate(
  id: string,
  photo: UnsplashPhoto
): Promise<string> {
  const dayRecord: Omit<DayRecord, 'id'> = {
    status: 'completed',
    photo,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await db.collection(COLLECTION_NAME).doc(id).set(dayRecord);
  return id;
}

/**
 * Get the UnsplashPhoto for a specific date
 * @param id - ISO date string (YYYY-MM-DD)
 * @returns Promise<NewDayRecord | CompletedDayRecord | null> - The day record or null if not found
 */
export async function getPhotoForDate(
  id: string
): Promise<NewDayRecord | CompletedDayRecord | null> {
  const doc = await db.collection(COLLECTION_NAME).doc(id).get();

  if (!doc.exists) {
    return null;
  }

  const data = {
    id: doc.id,
    ...doc.data(),
  } as DayRecord;

  // Return the appropriate type based on status
  if (data.status === 'completed' && data.photo) {
    return data as CompletedDayRecord;
  } else if (data.status === 'created' && data.photo === null) {
    return data as NewDayRecord;
  } else {
    // For 'processing' status or inconsistent data, return null
    // This ensures type safety by not returning ambiguous states
    return null;
  }
}

/**
 * Update an existing day record with a new photo
 * @param id - ISO date string (YYYY-MM-DD) - used as document ID
 * @param photo - New UnsplashPhoto object
 * @returns Promise<void>
 */
export async function updatePhotoForDay(
  id: string,
  photo: UnsplashPhoto
): Promise<void> {
  await db.collection(COLLECTION_NAME).doc(id).update({
    photo,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Update a day record with a photo and set status to completed
 * @param id - ISO date string (YYYY-MM-DD) - used as document ID
 * @param photo - UnsplashRandomPhoto object to store (will be converted to UnsplashPhoto)
 * @returns Promise<void>
 */
export async function completePhotoForDay(
  id: string,
  photo: UnsplashPhoto
): Promise<void> {
  await db.collection(COLLECTION_NAME).doc(id).update({
    photo: photo,
    status: 'completed',
    updatedAt: Timestamp.now(),
  });
}

/**
 * Update a day record status to processing
 * @param id - ISO date string (YYYY-MM-DD) - used as document ID
 * @returns Promise<void>
 */
export async function setDayRecordProcessing(id: string): Promise<void> {
  await db.collection(COLLECTION_NAME).doc(id).update({
    status: 'processing',
    updatedAt: Timestamp.now(),
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
    .where('__name__', '>=', startDate)
    .where('__name__', '<=', endDate)
    .orderBy('__name__', 'asc')
    .get();

  return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
    id: doc.id,
    ...doc.data(),
  })) as DayRecord[];
}

/**
 * Delete a day record
 * @param id - ISO date string (YYYY-MM-DD) - used as document ID
 * @returns Promise<void>
 */
export async function deleteDayRecord(id: string): Promise<void> {
  await db.collection(COLLECTION_NAME).doc(id).delete();
}

/**
 * Get the most recent day record
 * @returns Promise<DayRecord | null> - The most recent day record or null if none exist
 */
export async function getMostRecentPhoto(): Promise<DayRecord | null> {
  const snapshot = await db
    .collection(COLLECTION_NAME)
    .orderBy('__name__', 'desc')
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

/**
 * Create a new day record with 'created' status
 * @param id - ISO date string (YYYY-MM-DD)
 * @returns Promise<NewDayRecord> - The created day record
 */
export async function createNewDayRecord(id: string): Promise<NewDayRecord> {
  const newRecord: Omit<NewDayRecord, 'id'> = {
    status: 'created',
    photo: null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await db.collection(COLLECTION_NAME).doc(id).set(newRecord);

  return {
    id,
    ...newRecord,
  };
}
