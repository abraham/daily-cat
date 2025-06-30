import * as logger from 'firebase-functions/logger';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { DayRecord } from './types';
import { storePhotoId } from './storage/photo-id-storage';

/**
 * Firebase Function that triggers when a document is written (created or updated) in the 'days' collection.
 * This function records the photo ID in photo-id storage when a day record is updated with a photo.
 */
export const recordPhotoIdOnDayWrite = onDocumentWritten(
  {
    document: 'days/{dayId}',
  },
  async (event) => {
    const before = event.data?.before?.data() as DayRecord | undefined;
    const after = event.data?.after?.data() as DayRecord | undefined;

    if (!after) {
      logger.log('Document was deleted, no action needed');
      return;
    }

    const dayId = event.params.dayId;

    // Check if the document was updated with a photo
    if (after.photo && after.photo.id) {
      // Check if this is a new photo (either new document or photo changed)
      const isNewPhoto = !before?.photo || before.photo.id !== after.photo.id;

      if (isNewPhoto) {
        try {
          logger.log(`Recording photo ID ${after.photo.id} for day ${dayId}`);
          await storePhotoId(after.photo.id);
          logger.log(`Successfully recorded photo ID ${after.photo.id}`);
        } catch (error) {
          logger.error(`Error recording photo ID ${after.photo.id}:`, error);
        }
      } else {
        logger.log(
          `Photo ID ${after.photo.id} already recorded for day ${dayId}`
        );
      }
    }
  }
);
