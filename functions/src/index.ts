/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as logger from 'firebase-functions/logger';
import { onRequest } from 'firebase-functions/v2/https';
import * as fs from 'fs';
import { join } from 'path';
import * as catAPI from './cat-api';
import * as storage from './storage';
import { UnsplashPhoto } from './types';

const API_KEY = process.env.UNSPLASH_CLIENT_ID;

export const cat = onRequest(
  { secrets: ['UNSPLASH_CLIENT_ID'] },
  async (request, response) => {
    if (request.method !== 'GET') {
      response.status(403).send('Forbidden!');
      return;
    }

    if (!API_KEY) {
      response.status(500).send('API key not configured');
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
      let cat: UnsplashPhoto;

      if (dayRecord) {
        // Use existing photo for the date
        cat = dayRecord.photo;
        logger.log('Using existing cat photo for date:', requestedDate);
      } else {
        // Fetch new photo from API and save it for any date (past or present)
        cat = await catAPI.get({ clientId: API_KEY });
        await storage.savePhotoForDate(requestedDate, cat);
        logger.log('Fetched and saved new cat photo for date:', requestedDate);
      }

      logger.log('Cat photo details:', {
        id: cat.id,
        alt_description: cat.alt_description,
      });

      const templatePath = join(__dirname, '..', 'template.html');
      const htmlTemplate = await fs.promises.readFile(templatePath, 'utf8');

      // Get up to 5 tags
      const tags = cat.tags.slice(0, 5);
      const tagsHtml = tags
        .map(
          (tag: any) =>
            `<a href="https://unsplash.com/s/photos/${encodeURIComponent(tag.title)}" class="tag">${tag.title}</a>`
        )
        .join('');

      const html = htmlTemplate
        .replace('{{LINK_URL}}', cat.links.html)
        .replace('{{IMAGE_URL}}', cat.urls.full)
        .replace('{{USER_PROFILE_IMAGE}}', cat.user.profile_image.medium)
        .replace('{{USER_NAME}}', cat.user.name)
        .replace('{{USER_USERNAME}}', cat.user.username)
        .replace('{{USER_PROFILE_URL}}', cat.user.links.html)
        .replace('{{LIKES_COUNT}}', cat.likes.toLocaleString())
        .replace('{{ALT_DESCRIPTION}}', cat.alt_description || 'Cat photo')
        .replace('{{TAGS}}', tagsHtml);

      response.set('Cache-Control', 'public, max-age=1, s-maxage=1');
      response.status(200);
      response.send(html);
    } catch (error) {
      console.error('Error fetching cat:', error);
      response.status(500).send('Error fetching cat image');
    }
  }
);
