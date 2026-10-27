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
    // Get token from query parameter
    const token = request.query.token as string;

    if (!token) {
      response.status(400).send('Missing token parameter');
      return;
    }

    // Validate token format (basic check)
    if (typeof token !== 'string' || token.length < 10) {
      response.status(400).send('Invalid token format');
      return;
    }

    if (request.method === 'POST') {
      const requestedTopic = request.query.topic;
      if (
        requestedTopic !== undefined &&
        (typeof requestedTopic !== 'string' || !HOUR_TOPIC.test(requestedTopic))
      ) {
        response.status(400).send('Invalid topic. Use hour-00 to hour-23.');
        return;
      }

      await handleSubscription(
        token,
        requestedTopic ?? currentHourTopic(),
        response
      );
    } else if (request.method === 'DELETE') {
      // Unsubscribe from all topics and delete token
      await handleUnsubscription(token, response);
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

async function handleSubscription(token: string, topic: string, response: any) {
  try {
    logger.log(`Subscribing token to topic: ${topic}`);

    // Subscribe to the topic
    const subscriptionResult = await getMessaging().subscribeToTopic(
      [token],
      topic
    );

    if (subscriptionResult.successCount !== 1) {
      throw new Error(
        `Failed to subscribe to topic. Success count: ${subscriptionResult.successCount}`
      );
    }

    // Check if token document already exists
    const existingToken = await getTokenDocument(token);

    const previousTopics = (existingToken?.topics ?? []).filter(
      (previous) => previous !== topic
    );
    for (const previous of previousTopics) {
      try {
        await getMessaging().unsubscribeFromTopic([token], previous);
      } catch (error) {
        logger.error(`Error unsubscribing from topic ${previous}:`, error);
      }
    }

    const topics = [topic];

    // Save token document
    const timestampNow = Timestamp.now();
    const tokenData: Token = {
      token,
      topics,
      createdAt: existingToken ? existingToken.createdAt : timestampNow,
      updatedAt: timestampNow,
    };

    await saveTokenDocument(token, tokenData);

    logger.log(`Successfully subscribed token to topic: ${topic}`);
    response.status(200).json({
      success: true,
      message: `Subscribed to topic: ${topic}`,
      topics,
      unsubscribedTopics: previousTopics,
    });
  } catch (error) {
    logger.error('Error handling subscription:', error);
    throw error;
  }
}

async function handleUnsubscription(token: string, response: any) {
  try {
    // Get existing token document
    const existingToken = await getTokenDocument(token);

    if (!existingToken) {
      response.status(404).send('Token not found');
      return;
    }

    logger.log(
      `Unsubscribing token from topics: ${existingToken.topics.join(', ')}`
    );

    // Unsubscribe from all topics
    for (const topic of existingToken.topics) {
      try {
        await getMessaging().unsubscribeFromTopic([token], topic);
        logger.log(`Successfully unsubscribed from topic: ${topic}`);
      } catch (error) {
        logger.error(`Error unsubscribing from topic ${topic}:`, error);
        // Continue with other topics even if one fails
      }
    }

    // Delete token document
    await deleteTokenDocument(token);

    logger.log('Successfully deleted token document');
    response.status(200).json({
      success: true,
      message: 'Unsubscribed from all topics and deleted token',
      unsubscribedTopics: existingToken.topics,
    });
  } catch (error) {
    logger.error('Error handling unsubscription:', error);
    throw error;
  }
}
