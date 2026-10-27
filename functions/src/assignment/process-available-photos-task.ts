import * as logger from 'firebase-functions/logger';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import {
  get,
  getNextAvailablePhotoIds,
  NotFoundError,
  removeAvailablePhotoId,
} from '../ingestion';
import {
  addDays,
  getConfig,
  toDateString,
  unsplashClientId,
} from '../platform';
import { getPhotosForDateRange, savePhotoForDate } from './day-storage';
import { isPhotoIdUsed } from './photo-id-storage';

/** Every date from `startDate` through `endDate` without a completed record. */
export async function getDatesNeedingPhotosInRange(
  startDate: string,
  endDate: string
): Promise<string[]> {
  const records = await getPhotosForDateRange(startDate, endDate);
  const completedDates = new Set(
    records
      .filter((record) => record.status === 'completed')
      .map((record) => record.id)
  );

  const dates: string[] = [];
  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    if (!completedDates.has(date)) {
      dates.push(date);
    }
  }
  return dates;
}

/**
 * Dates that need photos: the next 30 days starting today, or if those are all
 * filled, every earlier day back to `minDate`.
 */
export async function getDatesNeedingPhotos(
  minDate: string
): Promise<string[]> {
  const today = toDateString(new Date());

  const futureDates = await getDatesNeedingPhotosInRange(
    today,
    addDays(today, 29)
  );
  if (futureDates.length > 0) {
    logger.log(
      `Found ${futureDates.length} dates in next 30 days needing photos`
    );
    return futureDates;
  }

  logger.log('Next 30 days are filled, checking backwards to minDate');
  const pastDates = await getDatesNeedingPhotosInRange(
    minDate,
    addDays(today, -1)
  );
  logger.log(
    `Found ${pastDates.length} dates working backwards needing photos`
  );
  return pastDates;
}

async function removeAvailablePhotoIdSafely(photoId: string): Promise<void> {
  try {
    await removeAvailablePhotoId(photoId);
    logger.log(`Removed not found photo ID ${photoId} from available list`);
  } catch (error) {
    logger.error(`Failed to remove not found photo ID ${photoId}:`, error);
  }
}

type AssignResult = 'assigned' | 'skipped';

/**
 * Assigns the photo to `date` and takes it off the available list. Skips (and
 * removes) photos that are already used or no longer exist on Unsplash.
 */
export async function assignPhotoToDate(
  photoId: string,
  date: string,
  clientId: string
): Promise<AssignResult> {
  try {
    if (await isPhotoIdUsed(photoId)) {
      logger.log(
        `Photo ID ${photoId} is already used, removing from available list`
      );
      await removeAvailablePhotoId(photoId);
      return 'skipped';
    }

    const photo = await get({ clientId }, photoId);
    await savePhotoForDate(date, photo);
    await removeAvailablePhotoId(photoId);
    logger.log(`Successfully processed photo ${photoId} for date ${date}`);
    return 'assigned';
  } catch (error) {
    if (error instanceof NotFoundError) {
      logger.log(`Photo ${photoId} not found, removing from available list`);
      await removeAvailablePhotoIdSafely(photoId);
      return 'skipped';
    }
    logger.error(
      `Non-recoverable error processing photo ID ${photoId}:`,
      error
    );
    throw error;
  }
}

/** Pairs available photos with the dates that need them, in order. */
export async function assignPhotos(
  photoIds: string[],
  dates: string[],
  clientId: string
): Promise<number> {
  let assigned = 0;
  for (const photoId of photoIds) {
    if (assigned >= dates.length) {
      logger.log('All dates needing photos have been filled');
      break;
    }
    if (
      (await assignPhotoToDate(photoId, dates[assigned], clientId)) ===
      'assigned'
    ) {
      assigned++;
    }
  }
  return assigned;
}

/**
 * Firebase Function that runs every hour to process available photo IDs.
 * Gets up to `processLimit` available photo IDs, checks if they're not already
 * used, fetches complete photo details, and assigns them to days that need photos.
 */
export const processAvailablePhotosScheduled = onSchedule(
  {
    schedule: 'every 1 hours',
    timeZone: 'UTC',
    secrets: [unsplashClientId],
    memory: '512MiB',
  },
  async () => {
    try {
      logger.log('Starting process available photos task');

      const config = await getConfig();
      const clientId = unsplashClientId.value();
      if (!clientId) {
        throw new Error('UNSPLASH_CLIENT_ID environment variable is not set');
      }

      const photoIds = await getNextAvailablePhotoIds(config.processLimit);
      logger.log(`Retrieved ${photoIds.length} available photo IDs`);
      if (photoIds.length === 0) {
        logger.log('No available photo IDs to process');
        return;
      }

      const dates = await getDatesNeedingPhotos(config.processingMinDate);
      logger.log(`Found ${dates.length} dates needing photos`);
      if (dates.length === 0) {
        logger.log('No dates need photos at this time');
        return;
      }

      const assigned = await assignPhotos(photoIds, dates, clientId);
      logger.log(
        `Process available photos task completed. Processed ${assigned} photos`
      );
    } catch (error) {
      logger.error('Error in process available photos task:', error);
      throw error; // Re-throw to trigger retry mechanism
    }
  }
);
