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
import { render } from '@lit-labs/ssr';
import * as catAPI from './cat-api';
import * as storage from './storage';
import { UnsplashPhoto } from './types';
import { calculateNavigationUrls } from './navigation';
import { renderTemplate } from './template';

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

      // Calculate navigation dates
      const { prevDateUrl, nextDateUrl, nextArrowClass } =
        calculateNavigationUrls(requestedDate);

      // Render template using lit-html
      const templateResult = renderTemplate({
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
        nextArrowClass,
      });

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
      console.error('Error fetching cat:', error);
      response.status(500).send('Error fetching cat image');
    }
  }
);
