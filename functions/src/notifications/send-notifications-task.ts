import * as logger from 'firebase-functions/logger';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getMessaging, Message } from 'firebase-admin/messaging';

/**
 * Firebase Function that runs every hour at the 15-minute mark to send
 * push notifications to subscribers of the current hour's topic.
 */
export const sendNotificationsScheduled = onSchedule(
  {
    schedule: '15 * * * *', // Run at 15 minutes past every hour
    timeZone: 'UTC',
  },
  async () => {
    try {
      logger.log('Starting scheduled notification send task');

      // Get current hour in 2-digit format (00-23)
      const now = new Date();
      const currentHour = now.getUTCHours().toString().padStart(2, '0');
      const topic = `/topics/hour-${currentHour}`;

      logger.log(`Sending notification to topic: ${topic}`);

      const message: Message = {
        topic,
        notification: {
          title: 'Daily Cat',
          body: "Today's cat is ready to pounce!",
        },
        webpush: { fcmOptions: { link: 'https://daily.cat' } },
      };

      // Send the message using Firebase Cloud Messaging
      const response = await getMessaging().send(message);

      logger.log(`Successfully sent notification. Message ID: ${response}`);
      logger.log(`Topic: ${topic}, Hour: ${currentHour}`);
    } catch (error) {
      logger.error('Error sending scheduled notification:', error);
      throw error;
    }
  }
);
