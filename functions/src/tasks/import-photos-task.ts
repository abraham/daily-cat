import * as logger from 'firebase-functions/logger';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { list } from '../api/cat-api';
import { getConfig, updateConfig } from '../storage/config-storage';
import { isPhotoIdUsed } from '../storage/photo-id-storage';
import { storeMultipleAvailablePhotoIds } from '../storage/available-photo-ids-storage';
import { unsplashClientId } from '../photo-processor';

/**
 * Firebase Function that runs every hour to import new cat photos.
 * Fetches 10 pages of photos from the cat API, filters out already used ones,
 * and stores the remaining photo IDs as available for selection.
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

      // Get current configuration
      const config = await getConfig();

      if (!config.importEnabled) {
        logger.log('Photo import is disabled in configuration');
        return;
      }

      let currentPage = Number(config.lastPage);
      const clientId = unsplashClientId.value();

      if (!clientId) {
        throw new Error('UNSPLASH_CLIENT_ID environment variable is not set');
      }

      logger.log(`Starting import from page ${currentPage}`);

      // Process importLimit pages of photos
      for (let i = 0; i < config.importLimit; i++) {
        try {
          logger.log(`Fetching page ${currentPage} from cat API`);

          // Get photos from cat API
          const searchResults = await list({
            clientId,
            page: currentPage.toString(),
          });

          logger.log(
            `Fetched ${searchResults.results.length} photos from page ${currentPage}`
          );

          // Filter out photos that are already used
          const availablePhotoIds: string[] = [];

          for (const photo of searchResults.results) {
            const isUsed = await isPhotoIdUsed(photo.id);
            if (!isUsed) {
              availablePhotoIds.push(photo.id);
            }
          }

          logger.log(
            `Found ${availablePhotoIds.length} new available photos from page ${currentPage}`
          );

          // Store available photo IDs if any were found
          if (availablePhotoIds.length > 0) {
            await storeMultipleAvailablePhotoIds(availablePhotoIds);
            logger.log(
              `Stored ${availablePhotoIds.length} available photo IDs from page ${currentPage}`
            );
          }

          // Update config with the latest page processed
          currentPage += 1;
          await updateConfig({ lastPage: currentPage.toString() });
          logger.log(`Updated config with lastPage: ${currentPage}`);
        } catch (error) {
          logger.error(`Error processing page ${currentPage}:`, error);
          // Continue with next page instead of failing the entire task
          continue;
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
