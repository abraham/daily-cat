import * as logger from 'firebase-functions/logger';
import { defineSecret } from 'firebase-functions/params';
import * as catApi from './cat-api';
import { completePhotoForDay } from './storage/day-storage';
import { isPhotoIdUsed } from './storage/photo-id-storage';

// Define the Unsplash client ID secret
const unsplashClientId = defineSecret('UNSPLASH_CLIENT_ID');

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

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    logger.log(
      `Attempt ${attempt}/${maxRetries}: Fetching cat photos from Unsplash API for day ${dayId}...`
    );

    try {
      const catPhotos = await catApi.list({ clientId });
      logger.log(
        `Received ${catPhotos.length} cat photos from API on attempt ${attempt}`
      );

      // Find the first photo that hasn't been used yet
      let selectedPhoto = null;
      for (const photo of catPhotos) {
        const isUsed = await isPhotoIdUsed(photo.id);
        if (!isUsed) {
          // Get the complete photo details using the photo ID
          logger.log(`Fetching complete photo details for ${photo.id}...`);
          try {
            selectedPhoto = await catApi.get({ clientId }, photo.id);
            logger.log(`Retrieved complete photo details for ${photo.id}`);
            logger.log(
              `Selected unused photo: ${photo.id} on attempt ${attempt}`
            );
            break;
          } catch (photoError) {
            logger.error(
              `Failed to fetch complete photo details for ${photo.id}:`,
              photoError
            );
            // Continue to next photo
            continue;
          }
        } else {
          logger.log(`Photo ${photo.id} already used, skipping...`);
        }
      }

      if (selectedPhoto) {
        // Update the day record with the complete photo data
        await completePhotoForDay(dayId, selectedPhoto);
        logger.log(
          `Successfully updated day record ${dayId} with photo ${selectedPhoto.id} on attempt ${attempt}`
        );
        return true;
      } else {
        logger.warn(
          `Attempt ${attempt}/${maxRetries}: No unused photos found for day ${dayId}. All ${catPhotos.length} photos from API are already used.`
        );

        if (attempt < maxRetries) {
          // Wait a bit before retrying to get potentially different photos
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
          logger.log(`Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    } catch (error) {
      logger.error(
        `Error on attempt ${attempt}/${maxRetries} for day ${dayId}:`,
        error
      );

      if (attempt < maxRetries) {
        // Wait before retrying on error
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        logger.log(`Waiting ${delay}ms before retry due to error...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  logger.error(
    `Failed to find unused photo for day ${dayId} after ${maxRetries} attempts`
  );
  return false;
}

// Export the secret so it can be used in Firebase Functions
export { unsplashClientId };
