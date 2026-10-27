import { getFirestore, Firestore, Timestamp } from 'firebase-admin/firestore';
import { getApp } from '../platform';
import { Token } from './token';

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

/**
 * Get the tokens least recently updated before a cutoff, oldest first
 * @param cutoff - Only tokens with `updatedAt` before this are returned
 * @param limit - Maximum number of tokens to return
 * @returns Promise<Token[]> - The matching token documents
 */
export async function getTokensUpdatedBefore(
  cutoff: Timestamp,
  limit: number
): Promise<Token[]> {
  const snapshot = await db
    .collection('tokens')
    .where('updatedAt', '<', cutoff)
    .orderBy('updatedAt', 'asc')
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => doc.data() as Token);
}

/**
 * Set `updatedAt` to now on several token documents in one batch
 * @param tokenIds - The token IDs to touch (at most 500)
 * @returns Promise<void>
 */
export async function touchTokenDocuments(tokenIds: string[]): Promise<void> {
  if (tokenIds.length === 0) return;
  const batch = db.batch();
  const now = Timestamp.now();
  for (const tokenId of tokenIds) {
    batch.update(db.collection('tokens').doc(tokenId), { updatedAt: now });
  }
  await batch.commit();
}

/**
 * Delete several token documents in one batch
 * @param tokenIds - The token IDs to delete (at most 500)
 * @returns Promise<void>
 */
export async function deleteTokenDocuments(tokenIds: string[]): Promise<void> {
  if (tokenIds.length === 0) return;
  const batch = db.batch();
  for (const tokenId of tokenIds) {
    batch.delete(db.collection('tokens').doc(tokenId));
  }
  await batch.commit();
}
