import { render } from '@lit-labs/ssr';
import * as logger from 'firebase-functions/logger';
import { onRequest } from 'firebase-functions/v2/https';
import { TemplateResult } from 'lit-html';
import { calculateNavigationUrls, NavigationUrls } from './navigation';
import { getConfig, SITE_URL, toDateString } from '../platform';
import { createNewDayRecord, getPhotoForDate } from '../assignment';
import type { UnsplashPhoto } from '../ingestion';
import {
  renderPhotoPage,
  renderProcessingPage,
  TemplateData,
} from './template';

const DEFAULT_DESCRIPTION = 'Your daily dose of adorable cat photos';
const HOUR = 60 * 60;
const DAY = 24 * HOUR;
const PROCESSING_CACHE_CONTROL = 'public, max-age=1, s-maxage=1';

/**
 * A finished past day only changes when the site is redeployed. Today's page
 * changes at the next UTC midnight: `/` moves on and the next-day arrow appears.
 */
export function photoPageCacheControl(date: string, now: Date): string {
  if (date < toDateString(now)) {
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

type ParsedDate = { date: string } | { status: number; body: string };

/** Maps a request path to the day it shows, or to the error response to send. */
export function parseRequestedDate(
  path: string,
  today: string,
  minDate: string
): ParsedDate {
  if (path === '/') {
    return { date: today };
  }

  const dateMatch = path.match(/^\/(\d{4}-\d{2}-\d{2})$/);
  if (!dateMatch) {
    return { status: 404, body: 'Invalid date format. Use YYYY-MM-DD.' };
  }

  const date = dateMatch[1];
  // Rejects dates like 2025-02-30, which Date silently rolls over.
  const dateObj = new Date(`${date}T00:00:00.000Z`);
  if (isNaN(dateObj.getTime()) || toDateString(dateObj) !== date) {
    return { status: 404, body: 'Invalid date.' };
  }

  if (date < minDate) {
    return {
      status: 403,
      body: `Forbidden! Dates before ${minDate} are not allowed.`,
    };
  }

  if (date > today) {
    return { status: 404, body: 'Future dates are not available.' };
  }

  return { date };
}

interface PageContext {
  title: string;
  url: string;
  navigation: NavigationUrls;
}

function photoPageData(
  photo: UnsplashPhoto,
  { title, url, navigation }: PageContext
): TemplateData {
  return {
    meta: {
      title,
      description: photo.alt_description
        ? `${capitalize(photo.alt_description)}. Photo by ${photo.user.name} on Unsplash.`
        : `A cat photo by ${photo.user.name} on Unsplash.`,
      url,
      imageUrl: photo.urls.regular,
      imageAlt: photo.alt_description || 'Cat photo',
    },
    linkUrl: photo.links.html,
    imageUrl: photo.urls.regular,
    userProfileImage: photo.user.profile_image.medium,
    userName: photo.user.name,
    userUsername: photo.user.username,
    userProfileUrl: photo.user.links.html,
    likesCount: photo.likes.toLocaleString(),
    altDescription: photo.alt_description || 'Cat photo',
    tags: photo.tags,
    ...navigation,
  };
}

function processingPageData({
  title,
  url,
  navigation,
}: PageContext): TemplateData {
  return {
    meta: {
      title,
      description: DEFAULT_DESCRIPTION,
      url,
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
    ...navigation,
  };
}

function renderToString(templateResult: TemplateResult): string {
  let html = '';
  for (const chunk of render(templateResult)) {
    html += chunk;
  }
  return html;
}

/**
 * Renders the photo page if the day is finished. Otherwise renders the
 * processing page, first creating the day's record if there isn't one.
 */
async function renderDayPage(
  date: string,
  path: string,
  now: Date,
  minDate: string
): Promise<{ html: string; cacheControl: string }> {
  const dayRecord = await getPhotoForDate(date);
  const context: PageContext = {
    title: `Daily Cat: ${formatDate(date)}`,
    url: path === '/' ? `${SITE_URL}/` : `${SITE_URL}/${date}`,
    navigation: calculateNavigationUrls(date, minDate),
  };

  if (dayRecord?.status === 'completed') {
    logger.log('Using existing cat photo for date:', date, {
      id: dayRecord.photo.id,
      alt_description: dayRecord.photo.alt_description,
    });
    return {
      html: renderToString(
        renderPhotoPage(photoPageData(dayRecord.photo, context))
      ),
      cacheControl: photoPageCacheControl(date, now),
    };
  }

  logger.log('No completed record found for date:', date);
  if (!dayRecord) {
    logger.log('Creating new day record for date:', date);
    await createNewDayRecord(date);
  }
  return {
    html: renderToString(renderProcessingPage(processingPageData(context))),
    cacheControl: PROCESSING_CACHE_CONTROL,
  };
}

export const cat = onRequest(async (request, response) => {
  if (request.method !== 'GET') {
    response.status(403).send('Forbidden!');
    return;
  }

  try {
    const now = new Date();
    const config = await getConfig();
    const path = request.url.split('?')[0];

    const parsed = parseRequestedDate(path, toDateString(now), config.minDate);
    if ('status' in parsed) {
      response.status(parsed.status).send(parsed.body);
      return;
    }

    const page = await renderDayPage(parsed.date, path, now, config.minDate);
    response.set('Cache-Control', page.cacheControl);
    response.status(200);
    response.send(page.html);
  } catch (error) {
    logger.error('Error fetching cat:', error);
    response.status(500).send('Error fetching cat image');
  }
});
