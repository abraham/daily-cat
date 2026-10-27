import * as logger from 'firebase-functions/logger';
import { onRequest } from 'firebase-functions/v2/https';
import { getMessaging } from 'firebase-admin/messaging';
import {
  getTokenDocument,
  saveTokenDocument,
  deleteTokenDocument,
} from './token-storage';
import { Token } from './token';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Firebase Function for managing FCM topic subscriptions
 *
 * POST /topics?token=<fcm_token>[&topic=hour-HH]
 * - Subscribes the token to `topic`, or to the current UTC hour's topic if omitted
 * - Unsubscribes the token from any other topic, so it gets one notification a day
 * - Saves the token and its topic to the 'tokens' collection
 *
 * DELETE /topics?token=<fcm_token>
 * - Unsubscribes the token from all previously subscribed topics
 * - Deletes the token document from the 'tokens' collection
 * - Returns success response with unsubscribed topics
 */
export const topics = onRequest(async (request, response) => {
  try {
    const token = request.query.token;
    if (!token) {
      response.status(400).send('Missing token parameter');
      return;
    }
    if (typeof token !== 'string' || token.length < 10) {
      response.status(400).send('Invalid token format');
      return;
    }

    if (request.method === 'POST') {
      const topic = parseTopic(request.query.topic);
      if (!topic) {
        response.status(400).send('Invalid topic. Use hour-00 to hour-23.');
        return;
      }
      response.status(200).json(await subscribe(token, topic));
    } else if (request.method === 'DELETE') {
      const result = await unsubscribe(token);
      if (!result) {
        response.status(404).send('Token not found');
        return;
      }
      response.status(200).json(result);
    } else {
      response.status(405).send('Method not allowed. Use POST or DELETE.');
    }
  } catch (error) {
    logger.error('Error in topics task:', error);
    response.status(500).send('Internal server error');
  }
});

const HOUR_TOPIC = /^hour-([01]\d|2[0-3])$/;

function currentHourTopic(): string {
  return `hour-${new Date().getUTCHours().toString().padStart(2, '0')}`;
}

/** The requested `hour-HH` topic, the current hour's if none, or null if invalid. */
function parseTopic(requested: unknown): string | null {
  if (requested === undefined) {
    return currentHourTopic();
  }
  return typeof requested === 'string' && HOUR_TOPIC.test(requested)
    ? requested
    : null;
}

/** Best effort: a failure on one topic is logged and the rest still run. */
async function unsubscribeFromTopics(
  token: string,
  topics: string[]
): Promise<void> {
  for (const topic of topics) {
    try {
      await getMessaging().unsubscribeFromTopic([token], topic);
    } catch (error) {
      logger.error(`Error unsubscribing from topic ${topic}:`, error);
    }
  }
}

/** Subscribes the token to `topic` only, and saves it. */
async function subscribe(token: string, topic: string) {
  logger.log(`Subscribing token to topic: ${topic}`);
  const result = await getMessaging().subscribeToTopic([token], topic);
  if (result.successCount !== 1) {
    throw new Error(
      `Failed to subscribe to topic. Success count: ${result.successCount}`
    );
  }

  const existingToken = await getTokenDocument(token);
  const previousTopics = (existingToken?.topics ?? []).filter(
    (previous) => previous !== topic
  );
  await unsubscribeFromTopics(token, previousTopics);

  const now = Timestamp.now();
  const tokenData: Token = {
    token,
    topics: [topic],
    createdAt: existingToken ? existingToken.createdAt : now,
    updatedAt: now,
  };
  await saveTokenDocument(token, tokenData);

  return {
    success: true,
    message: `Subscribed to topic: ${topic}`,
    topics: tokenData.topics,
    unsubscribedTopics: previousTopics,
  };
}

/** Unsubscribes the token from all its topics and deletes it. Null if unknown. */
async function unsubscribe(token: string) {
  const existingToken = await getTokenDocument(token);
  if (!existingToken) {
    return null;
  }

  logger.log(
    `Unsubscribing token from topics: ${existingToken.topics.join(', ')}`
  );
  await unsubscribeFromTopics(token, existingToken.topics);
  await deleteTokenDocument(token);

  return {
    success: true,
    message: 'Unsubscribed from all topics and deleted token',
    unsubscribedTopics: existingToken.topics,
  };
}
