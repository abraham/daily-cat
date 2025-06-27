import { expect } from 'chai';
import * as sinon from 'sinon';

const proxyquire = require('proxyquire');

// Mock API response for testing
const mockApiResponse = {
  id: 'jfQCT6XifkY',
  urls: {
    full: 'https://images.unsplash.com/photo-1468206449511-1af1a5c267ab?ixlib=rb-0.3.5&q=85&fm=jpg&crop=entropy&cs=srgb&s=7bb4c5cb67a099da47b4827552731b16',
  },
  links: {
    html: 'http://unsplash.com/photos/jfQCT6XifkY',
  },
};

describe('Cat Function', () => {
  let catApiStub: any;
  let myFunctions: any;

  beforeEach(() => {
    // Set up the API key environment variable for testing
    process.env.UNSPLASH_CLIENT_ID = 'test_client_id';

    // Create stub for cat API
    catApiStub = {
      get: sinon.stub().resolves(mockApiResponse),
    };

    // Use proxyquire to inject mocked dependencies
    myFunctions = proxyquire('../lib/index', {
      './cat-api': catApiStub,
    });
  });

  afterEach(() => {
    delete process.env.UNSPLASH_CLIENT_ID;
  });

  describe('cat function', () => {
    it('should handle GET requests', (done) => {
      const req = { method: 'GET' } as any;
      const res = {
        send: () => {
          expect(catApiStub.get.calledOnce).to.be.true;
          done();
        },
        set: () => res,
        status: () => res,
      } as any;

      myFunctions.cat(req, res);
    });

    it('should return 403 for non-GET requests', (done) => {
      const req = { method: 'POST' } as any;
      let statusCode: number = 0;

      const res = {
        send: (message: string) => {
          expect(statusCode).to.equal(403);
          expect(message).to.equal('Forbidden!');
          done();
        },
        set: () => res,
        status: (code: number) => {
          statusCode = code;
          return res;
        },
      } as any;

      myFunctions.cat(req, res);
    });

    it('should return 500 when API key is not configured', (done) => {
      delete process.env.UNSPLASH_CLIENT_ID;

      const req = { method: 'GET' } as any;
      let statusCode: number = 0;

      const res = {
        send: (message: string) => {
          expect(statusCode).to.equal(500);
          expect(message).to.equal('API key not configured');
          done();
        },
        set: () => res,
        status: (code: number) => {
          statusCode = code;
          return res;
        },
      } as any;

      myFunctions.cat(req, res);
    });

    it('should set caching headers', (done) => {
      const req = { method: 'GET' } as any;
      const res = {
        send: () => {},
        set: (key: string, value: string) => {
          expect(key).to.equal('Cache-Control');
          expect(value).to.equal('public, max-age=1, s-maxage=1');
          done();
        },
        status: () => res,
      } as any;

      myFunctions.cat(req, res);
    });

    it('should render valid HTML', (done) => {
      const req = { method: 'GET' } as any;
      const res = {
        send: (html: string) => {
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
        status: () => res,
      } as any;

      myFunctions.cat(req, res);
    });

    it('should include cat image and link in HTML', (done) => {
      const req = { method: 'GET' } as any;
      const res = {
        send: (html: string) => {
          expect(html).to.include(`<a href="${mockApiResponse.links.html}">`);
          expect(html).to.include(`<img src="${mockApiResponse.urls.full}">`);
          done();
        },
        set: () => res,
        status: () => res,
      } as any;

      myFunctions.cat(req, res);
    });

    it('should handle API errors gracefully', (done) => {
      // Replace stub with one that rejects
      catApiStub.get.rejects(new Error('API Error'));

      const req = { method: 'GET' } as any;
      let statusCode: number = 0;

      const res = {
        send: (message: string) => {
          expect(statusCode).to.equal(500);
          expect(message).to.equal('Error fetching cat image');
          done();
        },
        set: () => res,
        status: (code: number) => {
          statusCode = code;
          return res;
        },
      } as any;

      myFunctions.cat(req, res);
    });
  });
});
