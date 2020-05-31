// var fetch;
// const chai = require('chai');
// const assert = chai.assert;
// const chaiAsPromised = require("chai-as-promised");
// const sinon = require('sinon');
// // const fetchMock = require('fetch-mock');
//
// const UNSPLASH_API_CLIENT_ID = '267ae9223eb6dfa7289ce5084b3d3b744bb6eb919a362d0edbc8a08b0d8edcd8';
//
// chai.use(chaiAsPromised);
//
// // const apiResponse = `<?xml version="1.0"?>
// // <response>
// //   <data>
// //     <images>
// //       <image>
// //         <url>https://thecatapi.com/api/images/get.php?id=123</url>
// //         <id>123</id>
// //         <source_url>http://thecatapi.com/?id=123</source_url>
// //       </image>
// //     </images>
// //   </data>
// // </response>`;
//
// describe('catApi', () => {
//   var myFunctions, functions, fetchStub, catApi;
//
//   before(() => {
//     // fetchMock.get('*', apiResponse);
//     catApi = require('../cat-api.js');
//   });
//
//   after(() => {
//     // fetchMock.restore();
//   });
//
//   describe('get', () => {
//     it('should render', (done) => {
//
//       var cat = catApi.get({clientId: UNSPLASH_API_CLIENT_ID})
//         .then((cat) => {
//           assert.property(cat, 'id');
//           assert.property(cat, 'urls');
//           assert.property(cat, 'links');
//           assert.include(cat.urls.full, 'https://images.unsplash.com/');
//           assert.include(cat.links.html, 'http://unsplash.com/photos/');
//
//           done();
//         });
//     });
//   });
// });
