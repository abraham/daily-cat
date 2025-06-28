/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { render } from '@lit-labs/ssr';
import * as logger from 'firebase-functions/logger';
import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { calculateNavigationUrls } from './navigation';
import * as storage from './storage';
import { renderPhotoPage, renderProcessingPage } from './template';
import { TemplateResult } from 'lit-html';
import { DayRecord } from './types';
import { processPhotoForDay, unsplashClientId } from './photo-processor';

export const cat = onRequest(async (request, response) => {
  if (request.method !== 'GET') {
    response.status(403).send('Forbidden!');
    return;
  }

  try {
    // Extract date from URL path
    const path = request.url.split('?')[0]; // Remove query params
    let requestedDate: string;

    if (path === '/') {
      // Root path - use current date
      requestedDate = new Date().toISOString().split('T')[0];
    } else {
      // Extract date from path (format: /yyyy-mm-dd)
      const dateMatch = path.match(/^\/(\d{4}-\d{2}-\d{2})$/);

      if (!dateMatch) {
        response.status(404).send('Invalid date format. Use YYYY-MM-DD.');
        return;
      }

      requestedDate = dateMatch[1];

      // Validate date format and check if it's a valid date
      const dateObj = new Date(requestedDate + 'T00:00:00.000Z');
      if (
        isNaN(dateObj.getTime()) ||
        dateObj.toISOString().split('T')[0] !== requestedDate
      ) {
        response.status(404).send('Invalid date.');
        return;
      }

      // Check if the requested date is in the future
      const currentDate = new Date().toISOString().split('T')[0];
      if (requestedDate > currentDate) {
        response.status(404).send('Future dates are not available.');
        return;
      }
    }

    // Try to get existing cat photo for the requested date
    let dayRecord = await storage.getPhotoForDate(requestedDate);

    // Calculate navigation dates
    const { prevDateUrl, nextDateUrl, showNextArrow } =
      calculateNavigationUrls(requestedDate);

    let templateResult: TemplateResult;

    if (dayRecord && dayRecord.status === 'completed') {
      // Use existing photo for completed records
      const cat = dayRecord.photo;
      logger.log('Using existing cat photo for date:', requestedDate);

      logger.log('Cat photo details:', {
        id: cat.id,
        alt_description: cat.alt_description,
      });

      // Render photo page template using lit-html
      templateResult = renderPhotoPage({
        linkUrl: cat.links.html,
        imageUrl: cat.urls.full,
        userProfileImage: cat.user.profile_image.medium,
        userName: cat.user.name,
        userUsername: cat.user.username,
        userProfileUrl: cat.user.links.html,
        likesCount: cat.likes.toLocaleString(),
        altDescription: cat.alt_description || 'Cat photo',
        tags: cat.tags,
        prevDateUrl,
        nextDateUrl,
        showNextArrow,
      });
    } else {
      logger.log('No completed record found for date:', requestedDate);

      // No completed record found - create a new day record if none exists
      if (!dayRecord) {
        logger.log('Creating new day record for date:', requestedDate);
        dayRecord = await storage.createNewDayRecord(requestedDate);
      }

      // Render processing page template
      templateResult = renderProcessingPage({
        linkUrl: '',
        imageUrl: '',
        userProfileImage: '',
        userName: '',
        userUsername: '',
        userProfileUrl: '',
        likesCount: '',
        altDescription: '',
        tags: [],
        prevDateUrl,
        nextDateUrl,
        showNextArrow,
      });
    }

    // Convert lit-html template result to string
    const htmlIterator = render(templateResult);
    let html = '';
    for (const chunk of htmlIterator) {
      html += chunk;
    }

    response.set('Cache-Control', 'public, max-age=1, s-maxage=1');
    response.status(200);
    response.send(html);
  } catch (error) {
    logger.error('Error fetching cat:', error);
    response.status(500).send('Error fetching cat image');
  }
});

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
        await storage.setDayRecordProcessing(dayId);

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
