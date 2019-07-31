import * as sinon from "sinon";
import * as faker from "faker";
import {expect} from "chai";
import {Engine} from "../src/engine";
import {ResponseCache} from "../src/response-cache";
import {SinonMock} from "sinon";
import {createInterceptor, createPuppeteerRequest, createPuppeteerResponse} from "./helpers";
import {Interceptor} from "../src/interceptor";

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
    engine.onRequest(request, []);

    // Asset
    expect(interceptorSpy.notCalled).to.eq(true);
  });

  it('should call interceptors for requests', async () => {
    // Arrange
    const interceptors = [faker.random.word()] as any;
    const continueStub = sandbox.stub();
    const request = createPuppeteerRequest(sandbox, {
      continue: continueStub
    });
    cacheMock.expects('request').returns(false);
    const interceptorSpy = sandbox.stub(engine, 'handleInterceptors');

    // Act
    await engine.onRequest(request, interceptors);

    // Asset
    expect(interceptorSpy.calledWithExactly(interceptors, request)).to.eq(true);
  });

  describe('Interceptor handlers', () => {

  });
});
