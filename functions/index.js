'use-strict';

const functions = require('firebase-functions');
const catAPI = require('./cat-api.js');
// const API_KEY = '267ae9223eb6dfa7289ce5084b3d3b744bb6eb919a362d0edbc8a08b0d8edcd8';
const API_KEY = functions.config().unsplash.client_id;


exports.cat = functions.https.onRequest((request, response) => {
  if (request.method !== 'GET') {
    request.status(403).send('Forbidden!');
  }

  return catAPI.get({clientId: API_KEY })
    .then((cat) => {
      console.log(cat);
      // response.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
      response.set('Cache-Control', 'public, max-age=1, s-maxage=1');
      response.status(200)
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
    });
});
