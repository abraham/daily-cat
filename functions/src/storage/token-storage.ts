import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getApp } from '../platform';
import { Token } from '../types/token';

const db: Firestore = getFirestore(getApp());

/**
 * Get a token document from Firestore
 * @param tokenId - The token ID (same as the FCM token)
 * @returns Promise<Token | null> - The token document or null if not found
 */
export async function getTokenDocument(tokenId: string): Promise<Token | null> {
  const doc = await db.collection('tokens').doc(tokenId).get();

  if (!doc.exists) {
    return null;
  }

  return doc.data() as Token;
}

/**
 * Save a token document to Firestore
 * @param tokenId - The token ID (same as the FCM token)
 * @param tokenData - The token data to save
 * @returns Promise<void>
 */
export async function saveTokenDocument(
  tokenId: string,
  tokenData: Token
): Promise<void> {
  await db.collection('tokens').doc(tokenId).set(tokenData);
}

/**
 * Delete a token document from Firestore
 * @param tokenId - The token ID (same as the FCM token)
 * @returns Promise<void>
 */
export async function deleteTokenDocument(tokenId: string): Promise<void> {
  await db.collection('tokens').doc(tokenId).delete();
}
