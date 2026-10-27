import * as logger from 'firebase-functions/logger';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getMessaging } from 'firebase-admin/messaging';
import { Timestamp } from 'firebase-admin/firestore';
import {
  deleteTokenDocuments,
  getTokensUpdatedBefore,
  touchTokenDocuments,
} from './token-storage';

const DAY_MS = 24 * 60 * 60 * 1000;
const CHECK_AFTER_DAYS = 30;
// sendEach() accepts at most 500 messages, and a batch write at most 500 operations.
const TOKENS_PER_RUN = 500;
const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

/**
 * Firebase Function that runs daily to prune tokens FCM no longer accepts.
 * Tokens not confirmed for 30 days are checked with a dry-run send. Dead tokens
 * are unsubscribed from their topics and deleted; the rest are marked as confirmed.
 */
export const pruneTokensScheduled = onSchedule(
  {
    schedule: 'every 24 hours',
    timeZone: 'UTC',
  },
  async () => {
    const cutoff = Timestamp.fromMillis(Date.now() - CHECK_AFTER_DAYS * DAY_MS);
    const tokens = await getTokensUpdatedBefore(cutoff, TOKENS_PER_RUN);

    if (tokens.length === 0) {
      logger.log('No tokens to check');
      return;
    }

    const messaging = getMessaging();
    const result = await messaging.sendEach(
      tokens.map(({ token }) => ({ token, data: { type: 'token-check' } })),
      true
    );

    const dead = tokens.filter((_, i) => {
      const code = result.responses[i].error?.code;
      return code !== undefined && DEAD_TOKEN_CODES.has(code);
    });
    const deadIds = new Set(dead.map(({ token }) => token));
    // Other failures may be transient; checking them again in 30 days is enough.
    const kept = tokens.filter(({ token }) => !deadIds.has(token));

    const deadByTopic = new Map<string, string[]>();
    for (const { token, topics } of dead) {
      for (const topic of topics) {
        deadByTopic.set(topic, [...(deadByTopic.get(topic) ?? []), token]);
      }
    }
    for (const [topic, topicTokens] of deadByTopic) {
      try {
        await messaging.unsubscribeFromTopic(topicTokens, topic);
      } catch (error) {
        logger.error(`Error unsubscribing dead tokens from ${topic}:`, error);
      }
    }

    await deleteTokenDocuments([...deadIds]);
    await touchTokenDocuments(kept.map(({ token }) => token));

    logger.log(
      `Checked ${tokens.length} tokens: deleted ${dead.length}, kept ${kept.length}`
    );
  }
);
