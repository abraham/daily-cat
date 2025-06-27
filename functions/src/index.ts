import * as functions from 'firebase-functions';
import * as catAPI from './cat-api';
import * as fs from 'fs';
import * as path from 'path';

const API_KEY = process.env.UNSPLASH_CLIENT_ID;

export const cat = functions.https.onRequest(
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
      const cat = await catAPI.get({ clientId: API_KEY });
      console.log(cat);

      const templatePath = path.join(__dirname, '..', 'template.html');
      const htmlTemplate = await fs.promises.readFile(templatePath, 'utf8');

      const html = htmlTemplate
        .replace('{{LINK_URL}}', cat.links.html)
        .replace('{{IMAGE_URL}}', cat.urls.full);

      response.set('Cache-Control', 'public, max-age=1, s-maxage=1');
      response.status(200);
      response.send(html);
    } catch (error) {
      console.error('Error fetching cat:', error);
      response.status(500).send('Error fetching cat image');
    }
  }
);
