import * as logger from 'firebase-functions/logger';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { DayRecord } from './day';
import { processPhotoForDay } from './photo-processor';
import { unsplashClientId } from '../platform';
import { setDayRecordProcessing } from './day-storage';

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
      if (dayRecord.status === 'created') {
        await startAssignment(dayId);
      }
    } catch (error) {
      logger.error(`Error processing day record creation for ${dayId}:`, error);
    }
  }
);

/** Marks the day as processing so it's handled once, then finds it a photo. */
export async function startAssignment(dayId: string): Promise<void> {
  logger.log(`Processing new day record for date: ${dayId}`);
  await setDayRecordProcessing(dayId);

  const success = await processPhotoForDay(dayId, 10);
  if (!success) {
    logger.error(
      `Failed to assign photo to day record ${dayId} after 10 retry attempts`
    );
  }
}
