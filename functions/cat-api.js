const fetch = require('node-fetch');
// const xml2js = require('xml2js-es6-promise');

function get(options) {
  // let url = `https://thecatapi.com/api/images/get?format=xml&results_per_page=1&api_key=${key}&type=png,jpg`
  let url = `https://api.unsplash.com/photos/random?query=cat&client_id=${options.clientId}`;
  console.log('url', url);
  return fetch(url).then((body) => {
    console.log('body');
    return body.json();
  });
}

exports.get = get;
