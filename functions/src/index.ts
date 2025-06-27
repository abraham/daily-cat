import * as functions from 'firebase-functions';
import * as catAPI from './cat-api';

const API_KEY = process.env.UNSPLASH_CLIENT_ID;

export const cat = functions.https.onRequest(
  { secrets: ['UNSPLASH_CLIENT_ID'] },
  (request, response) => {
    if (request.method !== 'GET') {
      response.status(403).send('Forbidden!');
      return;
    }

    if (!API_KEY) {
      response.status(500).send('API key not configured');
      return;
    }

    return catAPI
      .get({ clientId: API_KEY })
      .then((cat) => {
        console.log(cat);
        response.set('Cache-Control', 'public, max-age=1, s-maxage=1');
        response.status(200);
        response.send(`<!doctype html>
        <head>
          <title>Daily Cat</title>
          <style>
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
            }
            img {
              position: fixed;
              top: 0;
              bottom: 0;
              left: 0;
              right: 0;
              max-width: 100%;
              max-height: 100%;
              margin: auto;
              overflow: auto;
          }
          </style>
        </head>
        <body>
        <a href="${cat.links.html}">
          <img src="${cat.urls.full}">
        </a>
        </body>
      </html>`);
      })
      .catch((error) => {
        console.error('Error fetching cat:', error);
        response.status(500).send('Error fetching cat image');
      });
  }
);
