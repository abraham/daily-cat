import * as logger from 'firebase-functions/logger';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { list } from './cat-api';
import { advanceLastPage, getConfig, unsplashClientId } from '../platform';
import { isPhotoIdUsed } from '../assignment';
import { storeMultipleAvailablePhotoIds } from './available-photo-ids-storage';

/** Stores the unused photo IDs from one search page and returns how many. */
async function importPage(page: number, clientId: string): Promise<number> {
  const { results } = await list({ clientId, page: page.toString() });

  const unusedIds: string[] = [];
  for (const photo of results) {
    if (!(await isPhotoIdUsed(photo.id))) {
      unusedIds.push(photo.id);
    }
  }

  if (unusedIds.length > 0) {
    await storeMultipleAvailablePhotoIds(unusedIds);
  }
  logger.log(
    `Page ${page}: stored ${unusedIds.length} of ${results.length} photos`
  );
  return unusedIds.length;
}

/**
 * Firebase Function that runs every hour to import new cat photos.
 * Fetches `importLimit` pages of photos from the cat API, filters out already
 * used ones, and stores the remaining photo IDs as available for selection.
 */
export const importPhotosScheduled = onSchedule(
  {
    schedule: 'every 1 hours',
    timeZone: 'UTC',
    secrets: [unsplashClientId],
  },
  async () => {
    try {
      logger.log('Starting scheduled photo import task');

      const config = await getConfig();
      if (!config.importEnabled) {
        logger.log('Photo import is disabled in configuration');
        return;
      }

      const clientId = unsplashClientId.value();
      if (!clientId) {
        throw new Error('UNSPLASH_CLIENT_ID environment variable is not set');
      }

      let currentPage = Number(config.lastPage);
      for (let i = 0; i < config.importLimit; i++) {
        try {
          await importPage(currentPage, clientId);
          currentPage = Number(await advanceLastPage(currentPage.toString()));
        } catch (error) {
          // One bad page shouldn't stop the rest of the import.
          logger.error(`Error processing page ${currentPage}:`, error);
        }
      }

      logger.log(
        `Completed photo import task. Processed pages ${parseInt(config.lastPage, 10) + 1} to ${currentPage}`
      );
    } catch (error) {
      logger.error('Error in scheduled photo import task:', error);
      throw error; // Re-throw to trigger retry mechanism
    }
  }
);
