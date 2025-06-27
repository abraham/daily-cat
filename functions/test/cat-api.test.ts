import { expect } from 'chai';
import * as sinon from 'sinon';

// Import after stubbing to avoid module loading issues
const proxyquire = require('proxyquire');

describe('Cat API', () => {
  let fetchStub: sinon.SinonStub;
  let catApi: any;

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
      } catch (error: any) {
        expect(error.message).to.equal('Network error');
      }
    });
  });
});