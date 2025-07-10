import { render } from '@lit-labs/ssr';
import * as logger from 'firebase-functions/logger';
import { onRequest } from 'firebase-functions/v2/https';
import { TemplateResult } from 'lit-html';
import { calculateNavigationUrls } from '../navigation';
import { getConfig } from '../storage/config-storage';
import { createNewDayRecord, getPhotoForDate } from '../storage/day-storage';
import { renderPhotoPage, renderProcessingPage } from '../template';

/**
 * Shared logic for processing a date request and rendering the appropriate template
 */
async function processDateRequest(requestedDate: string, response: any) {
  // Try to get existing cat photo for the requested date
  let dayRecord = await getPhotoForDate(requestedDate);

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
      imageUrl: cat.urls.regular,
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
      dayRecord = await createNewDayRecord(requestedDate);
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
}

/**
 * Function to show the current day's cat
 */
export const index = onRequest(async (request, response) => {
  if (request.method !== 'GET') {
    response.status(403).send('Forbidden!');
    return;
  }

  try {
    // Always use current date
    const requestedDate = new Date().toISOString().split('T')[0];
    await processDateRequest(requestedDate, response);
  } catch (error) {
    logger.error('Error fetching cat for current day:', error);
    response.status(500).send('Error fetching cat image');
  }
});

/**
 * Function to show previous days' cats
 */
export const show = onRequest(async (request, response) => {
  if (request.method !== 'GET') {
    response.status(403).send('Forbidden!');
    return;
  }

  try {
    const config = await getConfig();
    // Extract date from URL path
    const path = request.url.split('?')[0]; // Remove query params
    
    // Extract date from path (format: /yyyy-mm-dd)
    const dateMatch = path.match(/^\/(\d{4}-\d{2}-\d{2})$/);

    if (!dateMatch) {
      response.status(404).send('Invalid date format. Use YYYY-MM-DD.');
      return;
    }

    const requestedDate = dateMatch[1];

    // Validate date format and check if it's a valid date
    const dateObj = new Date(requestedDate + 'T00:00:00.000Z');
    if (
      isNaN(dateObj.getTime()) ||
      dateObj.toISOString().split('T')[0] !== requestedDate
    ) {
      response.status(404).send('Invalid date.');
      return;
    }

    // Check if the requested date is before the minimum allowed date
    if (requestedDate < config.minDate) {
      response
        .status(403)
        .send(`Forbidden! Dates before ${config.minDate} are not allowed.`);
      return;
    }

    // Check if the requested date is in the future
    const currentDate = new Date().toISOString().split('T')[0];
    if (requestedDate > currentDate) {
      response.status(404).send('Future dates are not available.');
      return;
    }

    await processDateRequest(requestedDate, response);
  } catch (error) {
    logger.error('Error fetching cat for date:', error);
    response.status(500).send('Error fetching cat image');
  }
});

// Keep the original cat function for backward compatibility
export const cat = onRequest(async (request, response) => {
  if (request.method !== 'GET') {
    response.status(403).send('Forbidden!');
    return;
  }

  try {
    const config = await getConfig();
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

      // Check if the requested date is before the minimum allowed date
      if (requestedDate < config.minDate) {
        response
          .status(403)
          .send(`Forbidden! Dates before ${config.minDate} are not allowed.`);
        return;
      }

      // Check if the requested date is in the future
      const currentDate = new Date().toISOString().split('T')[0];
      if (requestedDate > currentDate) {
        response.status(404).send('Future dates are not available.');
        return;
      }
    }

    await processDateRequest(requestedDate, response);
  } catch (error) {
    logger.error('Error fetching cat:', error);
    response.status(500).send('Error fetching cat image');
  }
});
