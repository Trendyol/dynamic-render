import * as sinon from "sinon";
import * as faker from "faker";
import {expect} from "chai";
import {ResponseCache} from "../src/response-cache";
import {createPuppeteerRequest, createPuppeteerResponse} from "./helpers";

const sandbox = sinon.createSandbox();
let responseCache: ResponseCache;


describe('[response-cache.ts]', () => {
  beforeEach(() => {
    responseCache = new ResponseCache()
  });

  afterEach(() => {
    sandbox.verifyAndRestore();
  });

  it('should create new ResponseCache', () => {
    // Arrange
    const responseCache = new ResponseCache();

    // Assert
    expect(responseCache).to.be.instanceOf(ResponseCache);
  });

  describe('Request from cache', () => {
    it('should return false on no cache key', async () => {
      // Arrange
      const request = createPuppeteerRequest(sandbox);

      // Act
      const handled = await responseCache.request(request);

      // Assert
      expect(handled).to.eq(false);
    });

    it('should return false for expired item', async () => {
      // Arrange
      const url = faker.random.word();
      const request = createPuppeteerRequest(sandbox);

      request.url = sandbox.stub().returns(url);

      responseCache.cache.set(url, {
        expires: 0
      } as any);

      // Act
      const handled = await responseCache.request(request);

      // Assert
      expect(handled).to.eq(false);
      expect(request.url.calledOnce).to.eq(true);
    });
  });

  it('should return true and respond when cache is valid', async () => {
    // Arrange
    const url = faker.random.word();
    const request = createPuppeteerRequest(sandbox);

    request.url = sandbox.stub().returns(url);

    responseCache.cache.set(url, {
      expires: Infinity
    } as any);

    // Act
    const handled = await responseCache.request(request);

    // Assert
    expect(handled).to.eq(true);
    expect(request.url.calledOnce).to.eq(true);
    expect(request.respond.calledOnce).to.eq(true);
  });

  describe('Incoming Response Handler', () => {
    it('should set cache successfully', async () => {
      // Arrange
      const status = 200;
      const expireTime = 300;
      const headers = {
        'cache-control': `Cache-Control: public, max-age=${expireTime}`
      };
      const url = faker.random.word();
      const body = faker.random.word() as any;
      const response = createPuppeteerResponse(sandbox, {
        url: sandbox.stub().returns(url),
        status: sandbox.stub().returns(status),
        headers: sandbox.stub().returns(headers),
        buffer: sandbox.stub().returns(body)
      });

      const setStub = sandbox.stub(responseCache.cache, 'set');

      // Act
      await responseCache.setCache(response);

      // Assert
      expect(setStub.calledWithExactly(url, {
        status,
        headers,
        body,
        expires: sinon.match.number
      })).to.eq(true);
    });

    it('should not set cache on buffer exception', async () => {
      // Arrange
      const status = 200;
      const expireTime = 300;
      const headers = {
        'cache-control': `Cache-Control: public, max-age=${expireTime}`
      };
      const url = faker.random.word();
      const response = createPuppeteerResponse(sandbox, {
        url: sandbox.stub().returns(url),
        status: sandbox.stub().returns(status),
        headers: sandbox.stub().returns(headers),
        buffer: sandbox.stub().throws()
      });

      const setStub = sandbox.stub(responseCache.cache, 'set');

      // Act
      await responseCache.setCache(response);

      // Assert
      expect(setStub.notCalled).to.eq(true);
    });

    it('should not cache when max age header not present', async () => {
      // Arrange
      const status = 200;
      const headers = {};
      const url = faker.random.word();
      const body = faker.random.word() as any;
      const response = createPuppeteerResponse(sandbox, {
        url: sandbox.stub().returns(url),
        status: sandbox.stub().returns(status),
        headers: sandbox.stub().returns(headers),
        buffer: sandbox.stub().returns(body)
      });

      const setStub = sandbox.stub(responseCache.cache, 'set');

      // Act
      await responseCache.setCache(response);

      // Assert
      expect(setStub.notCalled).to.eq(true);
    });

    it('should not cache when key exists with expire time passed', async () => {
      // Arrange
      const status = 200;
      const expireTime = 300;
      const headers = {
        'cache-control': `Cache-Control: public, max-age=${expireTime}`
      };
      const url = faker.random.word();
      const body = faker.random.word() as any;
      const response = createPuppeteerResponse(sandbox, {
        url: sandbox.stub().returns(url),
        status: sandbox.stub().returns(status),
        headers: sandbox.stub().returns(headers),
        buffer: sandbox.stub().returns(body)
      });

      const setStub = sandbox.stub(responseCache.cache, 'set');
      sandbox.stub(responseCache.cache, 'get').returns({expires: 0} as any);

      // Act
      await responseCache.setCache(response);

      // Assert
      expect(setStub.notCalled).to.eq(true);
    });

    it('should not cache when max age header is not valid', async () => {
      // Arrange
      const status = 200;
      const headers = {
        'cache-control': `Cache-Control: public`
      };
      const url = faker.random.word();
      const body = faker.random.word() as any;
      const response = createPuppeteerResponse(sandbox, {
        url: sandbox.stub().returns(url),
        status: sandbox.stub().returns(status),
        headers: sandbox.stub().returns(headers),
        buffer: sandbox.stub().returns(body)
      });

      const setStub = sandbox.stub(responseCache.cache, 'set');

      // Act
      await responseCache.setCache(response);

      // Assert
      expect(setStub.notCalled).to.eq(true);
    });
  });
});
