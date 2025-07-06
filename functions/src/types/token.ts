import { Timestamp } from 'firebase-admin/firestore';

export interface Token {
  /** The FCM token */
  token: string;
  /** Array of topics the token is subscribed to */
  topics: string[];
  /** Timestamp when the token was created */
  createdAt: Timestamp;
  /** Timestamp when the token was last updated */
  updatedAt: Timestamp;
}
