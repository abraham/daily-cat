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
import * as path from 'path';
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
      // Get current UTC date in YYYY-MM-DD format
      const currentDate = new Date().toISOString().split('T')[0];

      // Try to get existing cat photo for today
      let dayRecord = await storage.getPhotoForDate(currentDate);
      let cat: UnsplashPhoto;

      if (dayRecord) {
        // Use existing photo for today
        cat = dayRecord.photo;
        logger.log('Using existing cat photo for date:', currentDate);
      } else {
        // Fetch new photo from API and save it
        cat = await catAPI.get({ clientId: API_KEY });
        await storage.savePhotoForDate(currentDate, cat);
        logger.log('Fetched and saved new cat photo for date:', currentDate);
      }

      logger.log('Cat photo details:', {
        id: cat.id,
        alt_description: cat.alt_description,
      });

      const templatePath = path.join(__dirname, '..', 'template.html');
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
