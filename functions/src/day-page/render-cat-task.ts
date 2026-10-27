import { render } from '@lit-labs/ssr';
import * as logger from 'firebase-functions/logger';
import { onRequest } from 'firebase-functions/v2/https';
import { TemplateResult } from 'lit-html';
import { calculateNavigationUrls } from './navigation';
import { getConfig, SITE_URL } from '../platform';
import { createNewDayRecord, getPhotoForDate } from '../assignment';
import { renderPhotoPage, renderProcessingPage } from './template';

const DEFAULT_DESCRIPTION = 'Your daily dose of adorable cat photos';
const HOUR = 60 * 60;
const DAY = 24 * HOUR;
const PROCESSING_CACHE_CONTROL = 'public, max-age=1, s-maxage=1';

/**
 * A finished past day only changes when the site is redeployed. Today's page
 * changes at the next UTC midnight: `/` moves on and the next-day arrow appears.
 */
export function photoPageCacheControl(date: string, now: Date): string {
  if (date < now.toISOString().split('T')[0]) {
    return `public, max-age=${HOUR}, s-maxage=${DAY}`;
  }
  const nextMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1
  );
  const untilMidnight = Math.floor((nextMidnight - now.getTime()) / 1000);
  return `public, max-age=${Math.min(HOUR, untilMidnight)}, s-maxage=${untilMidnight}`;
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    dateStyle: 'long',
  });
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const cat = onRequest(async (request, response) => {
  if (request.method !== 'GET') {
    response.status(403).send('Forbidden!');
    return;
  }

  try {
    const now = new Date();
    const config = await getConfig();
    // Extract date from URL path
    const path = request.url.split('?')[0]; // Remove query params
    let requestedDate: string;

    if (path === '/') {
      // Root path - use current date
      requestedDate = now.toISOString().split('T')[0];
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
      const currentDate = now.toISOString().split('T')[0];
      if (requestedDate > currentDate) {
        response.status(404).send('Future dates are not available.');
        return;
      }
    }

    // Try to get existing cat photo for the requested date
    let dayRecord = await getPhotoForDate(requestedDate);

    // Calculate navigation dates
    const { prevDateUrl, showPrevArrow, nextDateUrl, showNextArrow } =
      calculateNavigationUrls(requestedDate, config.minDate);
    const pageUrl =
      path === '/' ? `${SITE_URL}/` : `${SITE_URL}/${requestedDate}`;
    const title = `Daily Cat: ${formatDate(requestedDate)}`;

    let templateResult: TemplateResult;
    let cacheControl: string;

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
        meta: {
          title,
          description: cat.alt_description
            ? `${capitalize(cat.alt_description)}. Photo by ${cat.user.name} on Unsplash.`
            : `A cat photo by ${cat.user.name} on Unsplash.`,
          url: pageUrl,
          imageUrl: cat.urls.regular,
          imageAlt: cat.alt_description || 'Cat photo',
        },
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
        showPrevArrow,
        nextDateUrl,
        showNextArrow,
      });
      cacheControl = photoPageCacheControl(requestedDate, now);
    } else {
      logger.log('No completed record found for date:', requestedDate);

      // No completed record found - create a new day record if none exists
      if (!dayRecord) {
        logger.log('Creating new day record for date:', requestedDate);
        dayRecord = await createNewDayRecord(requestedDate);
      }

      // Render processing page template
      templateResult = renderProcessingPage({
        meta: {
          title,
          description: DEFAULT_DESCRIPTION,
          url: pageUrl,
          imageUrl: `${SITE_URL}/images/cat.png`,
          imageAlt: 'Daily Cat - Adorable cat photo',
        },
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
        showPrevArrow,
        nextDateUrl,
        showNextArrow,
      });
      cacheControl = PROCESSING_CACHE_CONTROL;
    }

    // Convert lit-html template result to string
    const htmlIterator = render(templateResult);
    let html = '';
    for (const chunk of htmlIterator) {
      html += chunk;
    }

    response.set('Cache-Control', cacheControl);
    response.status(200);
    response.send(html);
  } catch (error) {
    logger.error('Error fetching cat:', error);
    response.status(500).send('Error fetching cat image');
  }
});
