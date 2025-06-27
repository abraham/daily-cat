const chai = require('chai');
const sinon = require('sinon');
const expect = chai.expect;

// Use proxyquire to mock dependencies
const proxyquire = require('proxyquire');

// Mock API response for testing
const mockApiResponse = {
  id: "jfQCT6XifkY",
  urls: {
    full: "https://images.unsplash.com/photo-1468206449511-1af1a5c267ab?ixlib=rb-0.3.5&q=85&fm=jpg&crop=entropy&cs=srgb&s=7bb4c5cb67a099da47b4827552731b16"
  },
  links: {
    html: "http://unsplash.com/photos/jfQCT6XifkY"
  }
};

describe('Cat Function', () => {
  let catApiStub;
  let myFunctions;

  beforeEach(() => {
    // Set up the API key environment variable for testing
    process.env.UNSPLASH_CLIENT_ID = 'test_client_id';
    
    // Create stub for cat API
    catApiStub = {
      get: sinon.stub().resolves(mockApiResponse)
    };

    // Use proxyquire to inject mocked dependencies
    myFunctions = proxyquire('../lib/index', {
      './cat-api': catApiStub
    });
  });

  afterEach(() => {
    delete process.env.UNSPLASH_CLIENT_ID;
  });

  describe('cat function', () => {
    it('should handle GET requests', (done) => {
      const req = { method: 'GET' };
      const res = {
        send: () => {
          expect(catApiStub.get.calledOnce).to.be.true;
          done();
        },
        set: () => res,
        status: () => res
      };

      myFunctions.cat(req, res);
    });

    it('should return 403 for non-GET requests', (done) => {
      const req = { method: 'POST' };
      let statusCode = 0;
      
      const res = {
        send: (message) => {
          expect(statusCode).to.equal(403);
          expect(message).to.equal('Forbidden!');
          done();
        },
        set: () => res,
        status: (code) => {
          statusCode = code;
          return res;
        }
      };

      myFunctions.cat(req, res);
    });

    it('should return 500 when API key is not configured', (done) => {
      delete process.env.UNSPLASH_CLIENT_ID;
      
      // Re-require the module to pick up env variable change
      delete require.cache[require.resolve('../lib/index')];
      const myFunctionsNoKey = require('../lib/index');
      
      const req = { method: 'GET' };
      let statusCode = 0;
      
      const res = {
        send: (message) => {
          expect(statusCode).to.equal(500);
          expect(message).to.equal('API key not configured');
          done();
        },
        set: () => res,
        status: (code) => {
          statusCode = code;
          return res;
        }
      };

      myFunctionsNoKey.cat(req, res);
    });

    it('should set caching headers', (done) => {
      const req = { method: 'GET' };
      const res = {
        send: () => {},
        set: (key, value) => {
          expect(key).to.equal('Cache-Control');
          expect(value).to.equal('public, max-age=1, s-maxage=1');
          done();
        },
        status: () => res
      };

      myFunctions.cat(req, res);
    });

    it('should render valid HTML', (done) => {
      const req = { method: 'GET' };
      const res = {
        send: (html) => {
          expect(html).to.include('<!doctype html>');
          expect(html).to.include('<head>');
          expect(html).to.include('</head>');
          expect(html).to.include('<body>');
          expect(html).to.include('</body>');
          expect(html).to.include('</html>');
          expect(html).to.include('<title>Daily Cat</title>');
          done();
        },
        set: () => res,
        status: () => res
      };

      myFunctions.cat(req, res);
    });

    it('should include cat image and link in HTML', (done) => {
      const req = { method: 'GET' };
      const res = {
        send: (html) => {
          expect(html).to.include(`<a href="${mockApiResponse.links.html}">`);
          expect(html).to.include(`<img src="${mockApiResponse.urls.full}">`);
          done();
        },
        set: () => res,
        status: () => res
      };

      myFunctions.cat(req, res);
    });

    it('should handle API errors gracefully', (done) => {
      // Replace stub with one that rejects
      catApiStub.get.rejects(new Error('API Error'));
      
      const req = { method: 'GET' };
      let statusCode = 0;
      
      const res = {
        send: (message) => {
          expect(statusCode).to.equal(500);
          expect(message).to.equal('Error fetching cat image');
          done();
        },
        set: () => res,
        status: (code) => {
          statusCode = code;
          return res;
        }
      };

      myFunctions.cat(req, res);
    });
  });
});

describe('Cat API', () => {
  let fetchStub;
  let catApi;

  beforeEach(() => {
    fetchStub = sinon.stub();
    
    // Use proxyquire to inject our mocked dependencies
    catApi = proxyquire('../lib/cat-api', {
      'node-fetch': fetchStub
    });
  });

  afterEach(() => {
    fetchStub.reset();
  });

  describe('get function', () => {
    it('should fetch cat data from Unsplash API', async () => {
      const mockResponse = {
        id: "test-id",
        urls: {
          full: "https://images.unsplash.com/test-full"
        },
        links: {
          html: "https://unsplash.com/photos/test-id"
        }
      };

      const mockFetchResponse = {
        json: () => Promise.resolve(mockResponse)
      };

      fetchStub.resolves(mockFetchResponse);

      const result = await catApi.get({ clientId: 'test-client-id' });

      expect(fetchStub.calledOnce).to.be.true;
      expect(fetchStub.calledWith('https://api.unsplash.com/photos/random?query=cat&client_id=test-client-id')).to.be.true;
      expect(result.id).to.equal('test-id');
    });

    it('should construct correct URL with client ID', async () => {
      const mockFetchResponse = {
        json: () => Promise.resolve({})
      };

      fetchStub.resolves(mockFetchResponse);

      await catApi.get({ clientId: 'my-client-id-123' });

      expect(fetchStub.calledWith('https://api.unsplash.com/photos/random?query=cat&client_id=my-client-id-123')).to.be.true;
    });

    it('should handle API errors', async () => {
      fetchStub.rejects(new Error('Network error'));

      try {
        await catApi.get({ clientId: 'test-client-id' });
        expect.fail('Expected error to be thrown');
      } catch (error) {
        expect(error.message).to.equal('Network error');
      }
    });
  });
});