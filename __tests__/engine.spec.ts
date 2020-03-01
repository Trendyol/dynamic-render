import sinon, {SinonMock} from "sinon";
import * as faker from "faker";
import {expect} from "chai";
import puppeteer from "puppeteer";
import {Engine} from "../src/engine";
import {ResponseCache} from "../src/response-cache";
import {createPuppeteerRequest, createPuppeteerResponse} from "./helpers";

const sandbox = sinon.createSandbox();
let engine: Engine;

const cache = {
  setCache: () => {
    throw new Error('Mocked method call: cache.setCache');
  },
  request: () => {
    throw new Error('Mocked method call: cache.request');
  }
} as any;

let cacheMock: SinonMock;

describe('[engine.ts]', () => {
  beforeEach(() => {
    cacheMock = sandbox.mock(cache);
    engine = new Engine(cache)
  });

  afterEach(() => {
    sandbox.verifyAndRestore();
  });

  it('should create new Engine', () => {
    // Arrange
    const engine = new Engine(cache);

    // Assert
    expect(engine).to.be.instanceOf(Engine);
  });

  it('should use response cache on response', () => {
    // Arrange
    const response = createPuppeteerResponse(sandbox);
    cacheMock.expects('setCache');

    // Act
    engine.onResponse(response);
  });

  it('should not handle request if responseCache handled', () => {
    // Arrange
    const continueStub = sandbox.stub();
    const browserPage = sandbox.stub() as any;
    const followRedirects = true;
    const request = createPuppeteerRequest(sandbox, {
      continue: continueStub
    });
    cacheMock.expects('request').returns(true);
    const interceptorSpy = sandbox.spy(engine, 'handleInterceptors');

    // Act
    engine.onRequest(request, [], browserPage, followRedirects);

    // Asset
    expect(interceptorSpy.notCalled).to.eq(true);
  });

  it('should call interceptors for requests', async () => {
    // Arrange
    const interceptors = [faker.random.word()] as any;
    const request = createPuppeteerRequest(sandbox);
    const browserPage = sandbox.stub() as any;
    const followRedirects = false;
    cacheMock.expects('request').returns(false);
    const interceptorSpy = sandbox.stub(engine, 'handleInterceptors');

    // Act
    await engine.onRequest(request, interceptors, browserPage, followRedirects);

    // Asset
    expect(interceptorSpy.calledWithExactly(interceptors, request)).to.eq(true);
  });

   it('should not call interceptors for requests ( followRedirect )', async () => {
      // Arrange
      const interceptors = [] as any;
      const browserPage = sandbox.stub() as any;
      const followRedirects = true;
      const request = createPuppeteerRequest(sandbox);
      request.isNavigationRequest = () => true
      request.resourceType = () => 'document'
      request.redirectChain = () => [
        {response: () => createPuppeteerResponse(sandbox)},
        {response: () => createPuppeteerResponse(sandbox)},
      ];

      // Act
      await engine.onRequest(request, interceptors, browserPage, followRedirects);

      // Asset
      expect(Object.keys(browserPage.redirect).length > 0).to.eq(true);
      expect(request.continue.calledOnce).to.eq(false);
      expect(request.abort.calledOnce).to.eq(true);
  });

  it('should call continue if there is no interceptor', async () => {
    // Arrange
    const interceptors = [] as any;
    const browserPage = sandbox.stub() as any;
    const followRedirects = true;
    const request = createPuppeteerRequest(sandbox);
    cacheMock.expects('request').resolves(false);

    // Act
    await engine.onRequest(request, [], browserPage, followRedirects);

    // Asset
    expect(request.continue.calledOnce).to.eq(true);
  });

  it('should create browser', async () => {
    // Arrange
    const browser = {
      on: () => {
        throw new Error("Mocked method called")
      }
    };
    const browserMock = sandbox.mock(browser);
    const stub = sandbox.stub(puppeteer, 'launch').returns(browser as any);
    browserMock.expects('on').withExactArgs('disconnected', engine.init).once();

    // Act
    await engine.init();

    // Assert
    expect(stub.calledWithExactly({
      headless: true,
      ignoreHTTPSErrors: true,
      devtools: false,
      args: ['--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage']
    })).to.eq(true);
  });

  it("should call request with correct params", async () => {
      const puppeteerMock=sandbox.mock(puppeteer);
      const request = createPuppeteerRequest(sandbox);
      const pageStub = {
        emulate: sandbox.stub(),
        _client: {
          send: sandbox.stub()
        },
        on: sandbox.stub().withArgs("request", sinon.match.func).callsArgWith(1, request),
        setRequestInterception: sandbox.stub()
      };

      cacheMock.expects('request').once();
      cacheMock.expects('setCache').once();

      const browserStub = {
        newPage: sandbox.stub().returns(pageStub),
        on: sandbox.stub()
      };

      puppeteerMock.expects("launch").withExactArgs({
        headless:true,
        ignoreHTTPSErrors:true,
        devtools:false,
        args: ['--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage']
      }).resolves(browserStub);

      await engine.init();
      await engine.createPage({} as any , [] as any, true)
  });

  it('should create new page and configure', async () => {
    // Arrange
    const pageStub = {
      emulate: sandbox.stub(),
      _client: {
        send: sandbox.stub()
      },
      on: sandbox.stub(),
      setRequestInterception: sandbox.stub()
    };
    const browserStub = {
      newPage: sandbox.stub().returns(pageStub),
      on: sandbox.stub()
    };
    sandbox.stub(puppeteer, 'launch').returns(browserStub as any);
    const request = createPuppeteerRequest(sandbox);
    const emulateOptions = {};
    const interceptors = [] as any;
    const followRedirects = true;
    const boundMethod = {
      request: {},
      interceptors: [],
      browserPage: browserStub,
      followRedirects,
    };
    engine.onRequest = sandbox.stub();

    // Act
    await engine.init();
    const page = await engine.createPage(emulateOptions, interceptors, followRedirects);

    // Assert
    expect(page).to.be.an('object');
    expect(pageStub.emulate.calledWithExactly(emulateOptions)).to.eq(true);
    expect(pageStub._client.send.calledWithExactly('Network.setBypassServiceWorker', {bypass: true})).to.eq(true);
    expect(pageStub._client.send.calledWithExactly('Network.setCacheDisabled', {
      cacheDisabled: false
    })).to.eq(true);
    expect(pageStub.setRequestInterception.calledWithExactly(true)).to.eq(true);
    expect(pageStub.on.calledWithExactly('request', sinon.match.func)).to.eq(true);
    expect(pageStub.on.calledWithExactly('response', engine.onResponse)).to.eq(true);

    pageStub.on.withArgs("request").callsArgWith(2, request);
  });

  describe('Rendering', () => {
    it('should handle render process (no hooks)', async () => {
      // Arrange
      const pageContent = faker.random.word();
      const pageStatus = 200;
      const pageStub = {
        goto: sandbox.stub().returns({
          status: sandbox.stub().returns(pageStatus)
        }),
        content: sandbox.stub().returns(pageContent),
        close: sandbox.stub().resolves()
      };
      const createPageStub = sandbox.stub(engine, 'createPage').resolves(pageStub as any);
      const renderOptions = {
        followRedirects: true,
        emulateOptions: {},
        url: faker.random.word(),
        waitMethod: faker.random.word(),
        hooks: [],
        interceptors: []
      };

      // Act
      const content = await engine.render(renderOptions as any);

      // Assert
      expect(createPageStub.calledWithExactly(renderOptions.emulateOptions, renderOptions.interceptors, renderOptions.followRedirects)).to.eq(true);
      expect(pageStub.goto.calledWithExactly(renderOptions.url, {waitUntil: renderOptions.waitMethod})).to.eq(true);
      expect(pageStub.close.calledOnce).to.eq(true);
      expect(content).to.deep.eq({
        status: pageStatus,
        html: pageContent
      });
    });

    it('should handle render process (null navigation)', async () => {
      // Arrange
      const pageContent = faker.random.word();
      const pageStatus = 200;
      const pageStub = {
        goto: sandbox.stub().returns(null),
        content: sandbox.stub().returns(pageContent),
        close: sandbox.stub().resolves()
      };
      const createPageStub = sandbox.stub(engine, 'createPage').resolves(pageStub as any);
      const renderOptions = {
        followRedirects: true,
        emulateOptions: {},
        url: faker.random.word(),
        waitMethod: faker.random.word(),
        hooks: [],
        interceptors: []
      };

      // Act
      const content = await engine.render(renderOptions as any);

      // Assert
      expect(createPageStub.calledWithExactly(renderOptions.emulateOptions, renderOptions.interceptors, renderOptions.followRedirects)).to.eq(true);
      expect(pageStub.goto.calledWithExactly(renderOptions.url, {waitUntil: renderOptions.waitMethod})).to.eq(true);
      expect(pageStub.close.calledOnce).to.eq(true);
      expect(content).to.deep.eq({
        status: 503,
        html: ''
      });
    });

    it('should handle render process (page creation failed)', async () => {
      // Arrange
      const renderOptions = {
        followRedirects: false,
        emulateOptions: {},
        url: faker.random.word(),
        waitMethod: faker.random.word(),
        hooks: [],
        interceptors: []
      };
      const createPageError = new Error(faker.random.word())
      const createPageStub = sandbox.stub(engine, 'createPage').rejects(createPageError);

      // Act
      const content = await engine.render(renderOptions as any);

      // Assert
      expect(createPageStub.calledWithExactly(renderOptions.emulateOptions, renderOptions.interceptors, renderOptions.followRedirects)).to.eq(true);
      expect(content).to.deep.eq({
        status: 503,
        html: ''
      });
    });


    it('should handle render process (with hooks)', async () => {
      // Arrange
      const pageContent = faker.random.word();
      const pageStatus = 200;
      const pageStub = {
        goto: sandbox.stub().returns({
          status: sandbox.stub().returns(pageStatus)
        }),
        content: sandbox.stub().returns(pageContent),
        close: sandbox.stub().resolves(pageContent)
      };
      const createPageStub = sandbox.stub(engine, 'createPage').resolves(pageStub as any);
      const hook = {
        handle: sandbox.stub()
      };
      const renderOptions = {
        followRedirects: true,
        emulateOptions: {},
        url: faker.random.word(),
        waitMethod: faker.random.word(),
        hooks: [hook],
        interceptors: []
      };

      // Act
      const content = await engine.render(renderOptions as any);

      // Assert
      expect(createPageStub.calledWithExactly(renderOptions.emulateOptions, renderOptions.interceptors, renderOptions.followRedirects)).to.eq(true);
      expect(pageStub.goto.calledWithExactly(renderOptions.url, {waitUntil: renderOptions.waitMethod})).to.eq(true);
      expect(pageStub.close.calledOnce).to.eq(true);
      expect(content).to.deep.eq({
        status: pageStatus,
        html: pageContent
      });
      expect(hook.handle.calledWithExactly(pageStub)).to.eq(true);
    });

    it('should handle render process (with followRedirect)', async () => {
      // Arrange
      const pageHeaders = { location: faker.internet.url() };
      const pageContent = '';
      const pageStatus = 301;
      const pageStub = {
        goto: sandbox.stub().returns({
          status: pageStatus,
          headers: sandbox.stub().returns(pageHeaders),
        }),
        content: sandbox.stub().returns(pageContent),
        close: sandbox.stub().resolves(pageContent),
        redirect: {
          status: sandbox.stub().returns(pageStatus),
          headers: sandbox.stub().returns(pageHeaders),
        }
      };
      const createPageStub = sandbox.stub(engine, 'createPage').resolves(pageStub as any);
      const hook = {
        handle: sandbox.stub()
      };
      const renderOptions = {
        followRedirects: true,
        emulateOptions: {},
        url: faker.internet.url(),
        waitMethod: faker.random.word(),
        hooks: [hook],
        interceptors: []
      };

      // Act
      const content = await engine.render(renderOptions as any);

      // Assert
      expect(createPageStub.calledWithExactly(renderOptions.emulateOptions, renderOptions.interceptors, renderOptions.followRedirects)).to.eq(true);
      expect(pageStub.goto.calledWithExactly(renderOptions.url, {waitUntil: renderOptions.waitMethod})).to.eq(true);
      expect(content.status).to.eq(pageStatus);
      expect(content.html).to.eq("");
      expect(pageStub.close.calledOnce).to.eq(true);
    });

    it('should handle render process (navigation fails)', async () => {
      // Arrange
      const pageContent = faker.random.word();
      const goToStubError=new Error(faker.random.word());
      const pageStub = {
        goto: sandbox.stub().rejects(goToStubError),
        content: sandbox.stub().returns(pageContent),
        close: sandbox.stub().resolves(pageContent),
      };
      const createPageStub = sandbox.stub(engine, 'createPage').resolves(pageStub as any);
      const renderOptions = {
        followRedirects: true,
        emulateOptions: {},
        url: faker.random.word(),
        waitMethod: faker.random.word(),
        hooks: [],
        interceptors: []
      };

      // Act
      const content = await engine.render(renderOptions as any);

      // Assert
      expect(createPageStub.calledWithExactly(renderOptions.emulateOptions, renderOptions.interceptors, renderOptions.followRedirects)).to.eq(true);
      expect(pageStub.goto.calledWithExactly(renderOptions.url, {waitUntil: renderOptions.waitMethod})).to.eq(true);
      expect(pageStub.close.calledOnce).to.eq(true);
      expect(content).to.deep.eq({
        status: 503,
        html: '',
      });
    });
  });

  describe('Interceptors', () => {
    it('should handle interceptors (no handle)', async () => {
      // Arrange
      const request = createPuppeteerRequest(sandbox);
      const interceptor = {
        handle: sandbox.stub()
      };
      const interceptors = [interceptor] as any;

      // Act
      await engine.handleInterceptors(interceptors, request);

      // Assert
      expect(interceptor.handle.calledOnce).to.eq(true);
    });

    it('should handle interceptors (blocks)', async () => {
      // Arrange
      const request = createPuppeteerRequest(sandbox);
      const interceptor = {
        handle: sandbox.stub().callsArg(2)
      };
      const interceptor2 = {
        handle: sandbox.stub()
      };
      const interceptors = [interceptor, interceptor2] as any;

      // Act
      await engine.handleInterceptors(interceptors, request);

      // Assert
      expect(interceptor.handle.calledOnce).to.eq(true);
      expect(interceptor2.handle.called).to.eq(false);
      expect(request.abort.calledWithExactly('blockedbyclient')).to.eq(true);
      expect(request.continue.called).to.eq(false);
    });

    it('should handle interceptors (responds)', async () => {
      // Arrange
      const request = createPuppeteerRequest(sandbox);
      const options = {};
      const interceptor = {
        handle: sandbox.stub().callsArgWith(1, options)
      };
      const interceptor2 = {
        handle: sandbox.stub()
      };
      const interceptors = [interceptor, interceptor2] as any;

      // Act
      await engine.handleInterceptors(interceptors, request);

      // Assert
      expect(interceptor.handle.calledOnce).to.eq(true);
      expect(interceptor2.handle.called).to.eq(false);
      expect(request.respond.calledWithExactly(options)).to.eq(true);
      expect(request.continue.called).to.eq(false);
    });
  });
});
