import * as sinon from "sinon";
import {SinonMock} from "sinon";
import * as faker from "faker";
import {expect} from "chai";
import puppeteer from "puppeteer";
import {Engine} from "../src/engine";
import {ResponseCache} from "../src/response-cache";
import {createPuppeteerRequest, createPuppeteerResponse} from "./helpers";

const sandbox = sinon.createSandbox();
let engine: Engine;

const cache = new ResponseCache();
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
    const request = createPuppeteerRequest(sandbox, {
      continue: continueStub
    });
    cacheMock.expects('request').returns(true);
    const interceptorSpy = sandbox.spy(engine, 'handleInterceptors');

    // Act
    engine.onRequest([], request);

    // Asset
    expect(interceptorSpy.notCalled).to.eq(true);
  });

  it('should call interceptors for requests', async () => {
    // Arrange
    const interceptors = [faker.random.word()] as any;
    const request = createPuppeteerRequest(sandbox);
    cacheMock.expects('request').returns(false);
    const interceptorSpy = sandbox.stub(engine, 'handleInterceptors');

    // Act
    await engine.onRequest(interceptors, request);

    // Asset
    expect(interceptorSpy.calledWithExactly(interceptors, request)).to.eq(true);
  });

  it('should call continue if there is no interceptor', async () => {
    // Arrange
    const interceptors = [] as any;
    const request = createPuppeteerRequest(sandbox);
    cacheMock.expects('request').resolves(false);

    // Act
    await engine.onRequest(interceptors, request);

    // Asset
    expect(request.continue.calledOnce).to.eq(true);
  });

  it('should create browser', async () => {
    // Arrange
    const stub = sandbox.stub(puppeteer, 'launch');

    // Act
    await engine.init();

    // Assert
    expect(stub.calledWithExactly({
      headless: true,
      ignoreHTTPSErrors: true,
      devtools: false
    })).to.eq(true);
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
      newPage: sandbox.stub().returns(pageStub)
    };
    sandbox.stub(puppeteer, 'launch').returns(browserStub as any);
    const emulateOptions = {};
    const interceptors = [] as any;

    const boundMethod = sandbox.stub();
    engine.onRequest.bind = sandbox.stub().returns(boundMethod);

    // Act
    await engine.init();
    const page = await engine.createPage(emulateOptions, interceptors);

    // Assert
    expect(page).to.be.an('object');
    expect(pageStub.emulate.calledWithExactly(emulateOptions)).to.eq(true);
    expect(pageStub._client.send.calledWithExactly('Network.setBypassServiceWorker', {bypass: true})).to.eq(true);
    expect(pageStub._client.send.calledWithExactly('Network.setCacheDisabled', {
      cacheDisabled: false
    })).to.eq(true);
    expect(pageStub.setRequestInterception.calledWithExactly(true)).to.eq(true);
    expect((engine.onRequest.bind as any).calledWithExactly(engine, interceptors)).to.eq(true);
    expect(pageStub.on.calledWithExactly('request', boundMethod)).to.eq(true);
    expect(pageStub.on.calledWithExactly('response', engine.onResponse)).to.eq(true);
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
        emulateOptions: {},
        url: faker.random.word(),
        waitMethod: faker.random.word(),
        hooks: [],
        interceptors: []
      };

      // Act
      const content = await engine.render(renderOptions as any);

      // Assert
      expect(createPageStub.calledWithExactly(renderOptions.emulateOptions, renderOptions.interceptors)).to.eq(true);
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
        emulateOptions: {},
        url: faker.random.word(),
        waitMethod: faker.random.word(),
        hooks: [],
        interceptors: []
      };

      // Act
      const content = await engine.render(renderOptions as any);

      // Assert
      expect(createPageStub.calledWithExactly(renderOptions.emulateOptions, renderOptions.interceptors)).to.eq(true);
      expect(pageStub.goto.calledWithExactly(renderOptions.url, {waitUntil: renderOptions.waitMethod})).to.eq(true);
      expect(pageStub.close.calledOnce).to.eq(true);
      expect(content).to.deep.eq({
        status: 404,
        html: ''
      });
    });

    it('should handle render process (page creation failed)', async () => {
      // Arrange
      const renderOptions = {
        emulateOptions: {},
        url: faker.random.word(),
        waitMethod: faker.random.word(),
        hooks: [],
        interceptors: []
      };
      const createPageStub = sandbox.stub(engine, 'createPage').throws();

      // Act
      const content = await engine.render(renderOptions as any);

      // Assert
      expect(createPageStub.calledWithExactly(renderOptions.emulateOptions, renderOptions.interceptors)).to.eq(true);
      expect(content).to.deep.eq({
        status: 404,
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
        close: sandbox.stub()
      };
      const createPageStub = sandbox.stub(engine, 'createPage').resolves(pageStub as any);
      const hook = {
        handle: sandbox.stub()
      };
      const renderOptions = {
        emulateOptions: {},
        url: faker.random.word(),
        waitMethod: faker.random.word(),
        hooks: [hook],
        interceptors: []
      };

      // Act
      const content = await engine.render(renderOptions as any);

      // Assert
      expect(createPageStub.calledWithExactly(renderOptions.emulateOptions, renderOptions.interceptors)).to.eq(true);
      expect(pageStub.goto.calledWithExactly(renderOptions.url, {waitUntil: renderOptions.waitMethod})).to.eq(true);
      expect(pageStub.close.calledOnce).to.eq(true);
      expect(content).to.deep.eq({
        status: pageStatus,
        html: pageContent
      });
      expect(hook.handle.calledWithExactly(pageStub)).to.eq(true);
    });

    it('should handle render process (navigation fails)', async () => {
      // Arrange
      const pageContent = faker.random.word();
      const pageStub = {
        goto: sandbox.stub().throws(),
        content: sandbox.stub().returns(pageContent),
        close: sandbox.stub(),
      };
      const createPageStub = sandbox.stub(engine, 'createPage').resolves(pageStub as any);
      const renderOptions = {
        emulateOptions: {},
        url: faker.random.word(),
        waitMethod: faker.random.word(),
        hooks: [],
        interceptors: []
      };

      // Act
      const content = await engine.render(renderOptions as any);

      // Assert
      expect(createPageStub.calledWithExactly(renderOptions.emulateOptions, renderOptions.interceptors)).to.eq(true);
      expect(pageStub.goto.calledWithExactly(renderOptions.url, {waitUntil: renderOptions.waitMethod})).to.eq(true);
      expect(pageStub.close.calledOnce).to.eq(true);
      expect(content).to.deep.eq({
        status: 404,
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
