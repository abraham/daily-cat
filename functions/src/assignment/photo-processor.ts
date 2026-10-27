import * as logger from 'firebase-functions/logger';
import * as catApi from '../ingestion';
import { completePhotoForDay } from './day-storage';
import { isPhotoIdUsed } from './photo-id-storage';
import { advanceLastPage, getConfig, unsplashClientId } from '../platform';

/** Waits 1 s, 2 s, 4 s, … up to 10 s before the next attempt. */
export function backoff(attempt: number): Promise<void> {
  const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
  logger.log(`Waiting ${delay}ms before retry...`);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Returns the full details of the first search result that isn't used yet.
 * A result whose details can't be fetched is skipped.
 */
export async function findUnusedPhoto(
  results: catApi.UnsplashSearchPhoto[],
  clientId: string
): Promise<catApi.UnsplashPhoto | null> {
  for (const result of results) {
    if (await isPhotoIdUsed(result.id)) {
      logger.log(`Photo ${result.id} already used, skipping...`);
      continue;
    }
    try {
      return await catApi.get({ clientId }, result.id);
    } catch (error) {
      logger.error(
        `Failed to fetch complete photo details for ${result.id}:`,
        error
      );
    }
  }
  return null;
}

/**
 * Process a day record by finding and assigning an unused cat photo
 * @param dayId - The day ID to process
 * @param maxRetries - Maximum number of retries if no photo is found
 * @returns Promise<boolean> - True if photo was successfully assigned, false otherwise
 */
export async function processPhotoForDay(
  dayId: string,
  maxRetries: number = 10
): Promise<boolean> {
  const clientId = unsplashClientId.value();
  const config = await getConfig();
  let page = config.lastPage;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    logger.log(
      `Attempt ${attempt}/${maxRetries}: Fetching cat photos for day ${dayId}`
    );

    try {
      const { results } = await catApi.list({ clientId, page });
      page = await advanceLastPage(page);

      const photo = await findUnusedPhoto(results, clientId);
      if (photo) {
        await completePhotoForDay(dayId, photo);
        logger.log(
          `Successfully updated day record ${dayId} with photo ${photo.id} on attempt ${attempt}`
        );
        return true;
      }
      logger.warn(
        `Attempt ${attempt}/${maxRetries}: No unused photos found for day ${dayId} among ${results.length} results.`
      );
    } catch (error) {
      logger.error(
        `Error on attempt ${attempt}/${maxRetries} for day ${dayId}:`,
        error
      );
    }

    if (attempt < maxRetries) {
      await backoff(attempt);
    }
  }

  logger.error(
    `Failed to find unused photo for day ${dayId} after ${maxRetries} attempts`
  );
  return false;
}
