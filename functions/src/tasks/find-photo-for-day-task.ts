import * as logger from 'firebase-functions/logger';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { DayRecord } from '../types';
import { processPhotoForDay, unsplashClientId } from '../photo-processor';
import { setDayRecordProcessing } from '../storage/day-storage';

/**
 * Firebase Function that triggers when a new document is created in the 'days' collection.
 * This function fetches a list of cat photos and finds one that hasn't been used yet,
 * then updates the day record with the selected photo.
 */
export const onDayRecordCreated = onDocumentCreated(
  {
    document: 'days/{dayId}',
    secrets: [unsplashClientId],
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn('No data associated with the event');
      return;
    }

    const dayId = event.params.dayId;
    const dayRecord = snapshot.data() as DayRecord;

    logger.log('New day record created:', {
      dayId,
      status: dayRecord.status,
      createdAt: dayRecord.createdAt,
    });

    try {
      // Handle the newly created day record
      if (dayRecord.status === 'created') {
        logger.log(`Processing new day record for date: ${dayId}`);

        // Set status to processing to prevent duplicate processing
        await setDayRecordProcessing(dayId);

        // Process the photo for the day record with retries
        const success = await processPhotoForDay(dayId, 10);
        if (!success) {
          logger.error(
            `Failed to assign photo to day record ${dayId} after 10 retry attempts`
          );
          // Optionally, you could set the record back to 'created' status to allow retry
        }
      }
    } catch (error) {
      logger.error(`Error processing day record creation for ${dayId}:`, error);
      // Optionally, you could set the record back to 'created' status to allow retry
    }
  }
);
