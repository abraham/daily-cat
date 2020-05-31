const chai = require('chai');
const assert = chai.assert;
const chaiAsPromised = require("chai-as-promised");
const sinon = require('sinon');
const apiRespones = {
	"id": "jfQCT6XifkY",
	"created_at": "2016-07-10T23:08:08-04:00",
	"updated_at": "2017-05-12T01:37:31-04:00",
	"width": 5456,
	"height": 3632,
	"color": "#F88954",
	"slug": null,
	"downloads": 2869,
	"likes": 59,
	"views": 309510,
	"liked_by_user": false,
	"exif": {
		"make": "Sony",
		"model": "SLT-A58",
		"exposure_time": "1/4000",
		"aperture": "4.5",
		"focal_length": "140",
		"iso": 100
	},
	"location": {
		"title": "Prague Zoo, Prague, Czech Republic",
		"name": "Prague Zoo",
		"city": "Prague",
		"country": "Czech Republic",
		"position": {
			"latitude": 50.1178458,
			"longitude": 14.4058748
		}
	},
	"current_user_collections": [],
	"urls": {
		"raw": "https://images.unsplash.com/photo-1468206449511-1af1a5c267ab",
		"full": "https://images.unsplash.com/photo-1468206449511-1af1a5c267ab?ixlib=rb-0.3.5&q=85&fm=jpg&crop=entropy&cs=srgb&s=7bb4c5cb67a099da47b4827552731b16",
		"regular": "https://images.unsplash.com/photo-1468206449511-1af1a5c267ab?ixlib=rb-0.3.5&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max&s=4a24f313c681f4e3a539a1b9d081ae07",
		"small": "https://images.unsplash.com/photo-1468206449511-1af1a5c267ab?ixlib=rb-0.3.5&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=400&fit=max&s=1d3e56dc116333c1f9d262ac6e42608e",
		"thumb": "https://images.unsplash.com/photo-1468206449511-1af1a5c267ab?ixlib=rb-0.3.5&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=200&fit=max&s=107b7947f9baf965d3b5e18b3b0afc46"
	},
	"categories": [{
		"id": 4,
		"title": "Nature",
		"photo_count": 54184,
		"links": {
			"self": "https://api.unsplash.com/categories/4",
			"photos": "https://api.unsplash.com/categories/4/photos"
		}
	}],
	"links": {
		"self": "https://api.unsplash.com/photos/jfQCT6XifkY",
		"html": "http://unsplash.com/photos/jfQCT6XifkY",
		"download": "http://unsplash.com/photos/jfQCT6XifkY/download",
		"download_location": "https://api.unsplash.com/photos/jfQCT6XifkY/download"
	},
	"user": {
		"id": "qFQHO9ZSnr4",
		"updated_at": "2017-05-23T21:30:59-04:00",
		"username": "martz90",
		"name": "Martin Kníže",
		"first_name": "Martin",
		"last_name": "Kníže",
		"portfolio_url": null,
		"bio": "",
		"location": null,
		"total_likes": 4,
		"total_photos": 22,
		"total_collections": 0,
		"profile_image": {
			"small": "https://images.unsplash.com/profile-fb-1443302223-ab31e840c09e.jpg?ixlib=rb-0.3.5&q=80&fm=jpg&crop=faces&cs=tinysrgb&fit=crop&h=32&w=32&s=f76a6496b292de013d1017f71654aca3",
			"medium": "https://images.unsplash.com/profile-fb-1443302223-ab31e840c09e.jpg?ixlib=rb-0.3.5&q=80&fm=jpg&crop=faces&cs=tinysrgb&fit=crop&h=64&w=64&s=073f9d93b7bebb32ec15b9592db54b31",
			"large": "https://images.unsplash.com/profile-fb-1443302223-ab31e840c09e.jpg?ixlib=rb-0.3.5&q=80&fm=jpg&crop=faces&cs=tinysrgb&fit=crop&h=128&w=128&s=e473a8dd928823003bcb2179f70da9d0"
		},
		"links": {
			"self": "https://api.unsplash.com/users/martz90",
			"html": "http://unsplash.com/@martz90",
			"photos": "https://api.unsplash.com/users/martz90/photos",
			"likes": "https://api.unsplash.com/users/martz90/likes",
			"portfolio": "https://api.unsplash.com/users/martz90/portfolio",
			"following": "https://api.unsplash.com/users/martz90/following",
			"followers": "https://api.unsplash.com/users/martz90/followers"
		}
	}
}

// const myFunctions = require('../index');

chai.use(chaiAsPromised);

describe('Cat', () => {
  var myFunctions, functions, apiStub, catApi;

  before(() => {
    functions = require('firebase-functions');
    myFunctions = require('../index');
    catApi = require('../cat-api.js');

    apiStub = sinon.stub(catApi, 'get')
      .withArgs({ clientId: '267ae9223eb6dfa7289ce5084b3d3b744bb6eb919a362d0edbc8a08b0d8edcd8' })
      .returns(new Promise((resolve, reject) => { resolve(apiRespones) }));
  });

  after(() => {
    catApi.get.restore();
  });

  describe('cat', () => {
    it('should render', (done) => {
      const req = { method: 'GET' };
      const res = {
        send: () => {},
        set: () => {},
        status: () => {}
      };

      myFunctions.cat(req, res);
      done();
    });

    it('should return a 200', (done) => {
      const req = { method: 'GET' };
      const res = {
        send: () => {},
        set: () => {},
        status: (status) => {
          console.log('STATUS', status)
          assert.equal(status, 200)
          done();
        }
      };

      myFunctions.cat(req, res);
    });

    it('should set caching headers', (done) => {
      const req = { method: 'GET' };
      const res = {
        send: () => {},
        set: (key, value) => {
          assert.equal(key, 'Cache-Control')
          assert.equal(value, 'public, max-age=1, s-maxage=1')
          done();
        },
        status: () => {}
      };

      myFunctions.cat(req, res);
    });

    it('should render html', (done) => {
      const req = { method: 'GET' };
      const res = {
        send: (html) => {
          assert.include(html, '<!doctype html>');
          assert.include(html, '<head>');
          assert.include(html, '</head>');
          assert.include(html, '<body>');
          assert.include(html, '</body>');
          assert.include(html, '</html>');
          done();
        },
        set: () => {},
        status: () => {}
      };

      myFunctions.cat(req, res);
    });

    it('should render cat image', (done) => {
      const req = { method: 'GET' };
      const res = {
        send: (html) => {
          assert.include(html, '<a href="https://example.com/cat"><img src="https://example.com/cat.png"></a>');
          done();
        },
        set: () => {},
        status: () => {}
      };

      myFunctions.cat(req, res);
    });
  });
});
