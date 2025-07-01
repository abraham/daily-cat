import * as logger from 'firebase-functions/logger';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { get } from '../api/cat-api';
import { getConfig } from '../storage/config-storage';
import {
  getNextAvailablePhotoIds,
  removeAvailablePhotoId,
} from '../storage/available-photo-ids-storage';
import { isPhotoIdUsed } from '../storage/photo-id-storage';
import { getPhotoForDate, completePhotoForDay } from '../storage/day-storage';
import { unsplashClientId } from '../photo-processor';

/**
 * Generate date string in YYYY-MM-DD format
 * @param date - Date object
 * @returns ISO date string
 */
function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Add days to a date
 * @param date - Base date
 * @param days - Number of days to add (can be negative)
 * @returns New date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get list of dates that need photos (next 30 days forward, then backwards to minDate)
 * @param minDate - Minimum date from config
 * @returns Array of date strings that need photos
 */
async function getDatesNeedingPhotos(minDate: string): Promise<string[]> {
  const today = new Date();
  const minDateObj = new Date(minDate);
  const dates: string[] = [];

  // First, check next 30 days forward from today
  for (let i = 0; i < 30; i++) {
    const checkDate = addDays(today, i);
    const dateString = formatDateString(checkDate);

    const existingRecord = await getPhotoForDate(dateString);
    if (!existingRecord || existingRecord.status !== 'completed') {
      dates.push(dateString);
    }
  }

  // If we have dates to fill, return them first
  if (dates.length > 0) {
    logger.log(`Found ${dates.length} dates in next 30 days needing photos`);
    return dates;
  }

  // If next 30 days are filled, work backwards from today to minDate
  logger.log('Next 30 days are filled, checking backwards to minDate');
  const backwardDates: string[] = [];

  for (let i = 1; i <= 365; i++) {
    // Limit to 1 year back to prevent infinite loops
    const checkDate = addDays(today, -i);

    // Stop if we've gone before minDate
    if (checkDate < minDateObj) {
      break;
    }

    const dateString = formatDateString(checkDate);
    const existingRecord = await getPhotoForDate(dateString);

    if (!existingRecord || existingRecord.status !== 'completed') {
      backwardDates.push(dateString);
    }
  }

  logger.log(
    `Found ${backwardDates.length} dates working backwards needing photos`
  );
  return backwardDates;
}

/**
 * Firebase Function that runs every hour to process available photo IDs.
 * Gets up to 10 available photo IDs, checks if they're not already used,
 * fetches complete photo details, and assigns them to days that need photos.
 */
export const processAvailablePhotosScheduled = onSchedule(
  {
    schedule: 'every 1 hours',
    timeZone: 'UTC',
    secrets: [unsplashClientId],
  },
  async () => {
    try {
      logger.log('Starting process available photos task');

      // Get current configuration
      const config = await getConfig();
      const clientId = unsplashClientId.value();

      if (!clientId) {
        throw new Error('UNSPLASH_CLIENT_ID environment variable is not set');
      }

      // Get up to 10 available photo IDs
      const availablePhotoIds = await getNextAvailablePhotoIds();
      logger.log(`Retrieved ${availablePhotoIds.length} available photo IDs`);

      if (availablePhotoIds.length === 0) {
        logger.log('No available photo IDs to process');
        return;
      }

      // Get dates that need photos
      const datesNeedingPhotos = await getDatesNeedingPhotos(config.minDate);
      logger.log(`Found ${datesNeedingPhotos.length} dates needing photos`);

      if (datesNeedingPhotos.length === 0) {
        logger.log('No dates need photos at this time');
        return;
      }

      let processedCount = 0;
      let dateIndex = 0;

      // Process each available photo ID
      for (const photoId of availablePhotoIds) {
        if (dateIndex >= datesNeedingPhotos.length) {
          logger.log('All dates needing photos have been filled');
          break;
        }

        try {
          // Check if photo ID is already used
          const isUsed = await isPhotoIdUsed(photoId);
          if (isUsed) {
            logger.log(
              `Photo ID ${photoId} is already used, removing from available list`
            );
            await removeAvailablePhotoId(photoId);
            continue;
          }

          // Get complete photo details from cat API
          logger.log(`Fetching complete photo details for ${photoId}`);
          const photoDetails = await get({ clientId }, photoId);

          // Assign photo to the next date that needs one
          const targetDate = datesNeedingPhotos[dateIndex];
          logger.log(`Assigning photo ${photoId} to date ${targetDate}`);

          // Complete the photo for the day
          await completePhotoForDay(targetDate, photoDetails);

          // Remove the photo ID from available list since it's now used
          await removeAvailablePhotoId(photoId);

          processedCount++;
          dateIndex++;

          logger.log(
            `Successfully processed photo ${photoId} for date ${targetDate}`
          );
        } catch (error) {
          logger.error(`Error processing photo ID ${photoId}:`, error);

          // Remove problematic photo ID from available list
          try {
            await removeAvailablePhotoId(photoId);
            logger.log(
              `Removed problematic photo ID ${photoId} from available list`
            );
          } catch (removeError) {
            logger.error(
              `Failed to remove problematic photo ID ${photoId}:`,
              removeError
            );
          }

          // Continue with next photo
          continue;
        }
      }

      logger.log(
        `Process available photos task completed. Processed ${processedCount} photos`
      );
    } catch (error) {
      logger.error('Error in process available photos task:', error);
      throw error; // Re-throw to trigger retry mechanism
    }
  }
);
