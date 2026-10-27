import * as logger from 'firebase-functions/logger';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import {
  getMessaging,
  Messaging,
  SendResponse,
} from 'firebase-admin/messaging';
import { Timestamp } from 'firebase-admin/firestore';
import {
  deleteTokenDocuments,
  getTokensUpdatedBefore,
  touchTokenDocuments,
} from './token-storage';
import { Token } from './token';

const DAY_MS = 24 * 60 * 60 * 1000;
const CHECK_AFTER_DAYS = 30;
// sendEach() accepts at most 500 messages, and a batch write at most 500 operations.
const TOKENS_PER_RUN = 500;
const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

/** Tokens whose dry-run send failed with a code that means FCM dropped them. */
export function findDeadTokens(
  tokens: Token[],
  responses: SendResponse[]
): Token[] {
  return tokens.filter((_, i) => {
    const code = responses[i].error?.code;
    return code !== undefined && DEAD_TOKEN_CODES.has(code);
  });
}

/** One call per topic; a failure is logged and the other topics still run. */
export async function unsubscribeDeadTokens(
  messaging: Messaging,
  dead: Token[]
): Promise<void> {
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
}

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

    const dead = findDeadTokens(tokens, result.responses);
    // Other failures may be transient; checking them again in 30 days is enough.
    const kept = tokens.filter((token) => !dead.includes(token));

    await unsubscribeDeadTokens(messaging, dead);
    await deleteTokenDocuments(dead.map(({ token }) => token));
    await touchTokenDocuments(kept.map(({ token }) => token));

    logger.log(
      `Checked ${tokens.length} tokens: deleted ${dead.length}, kept ${kept.length}`
    );
  }
);
