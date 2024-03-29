import * as sinon from "sinon";
import {SinonMock} from "sinon";
import {expect} from "chai";
import {DynamicRender, PrerenderDefaultConfiguration, WorkerRenderOptions} from "../src/dynamic-render";
import {Server} from "../src/server";
import {Engine} from "../src/engine";
import {Hook, HookConfiguration} from "../src/hook";
import * as faker from "faker";
import {Interceptor, InterceptorConfiguration} from "../src/interceptor";
import {Page, PageSettings} from "../src/page";
import {Application, ApplicationConfig} from "../src/application";
import {createExpressRequestMock, createExpressResponseMock} from "./helpers";
import {ResponseCache} from "../src/response-cache";

const sandbox = sinon.createSandbox();

const responseCache = new ResponseCache();
const server = new Server();
const renderer = new Engine(responseCache);

let dynamicRender: DynamicRender;

let serverMock: SinonMock;
let engineMock: SinonMock;

describe('[prerender.ts]', () => {
  beforeEach(() => {
    serverMock = sandbox.mock(server);
    engineMock = sandbox.mock(renderer);
    dynamicRender = new DynamicRender(server, renderer);
  });

  afterEach(() => {
    sandbox.verifyAndRestore();
  });

  it('should create new DynamicRender', () => {
    // Arrange
    const dynamicRender = new DynamicRender(server, renderer);

    // Assert
    expect(dynamicRender).to.be.instanceOf(DynamicRender);
  });

  it('should start server', async () => {
    // Arrange
    const port = 8080; //Default port
    serverMock.expects('listen').withExactArgs(port).resolves(port);
    engineMock.expects('init');

    const dynamicRender = new DynamicRender(server, renderer);

    // Act
    await dynamicRender.start();
  });

  it('should create new hook', () => {
    // Arrange
    const hooksProps: HookConfiguration = {
      name: faker.random.word(),
      handler: sandbox.spy()
    };

    // Act
    const hook = dynamicRender.hook(hooksProps);

    // Assert
    expect(hook).to.be.instanceOf(Hook);
  });

  it('should create new interceptor', () => {
    // Arrange
    const interceptorProps: InterceptorConfiguration = {
      name: faker.random.word(),
      handler: sandbox.spy()
    };

    // Act
    const interceptor = dynamicRender.interceptor(interceptorProps);

    // Assert
    expect(interceptor).to.be.instanceOf(Interceptor);
  });

  it('should create new page', () => {
    // Arrange
    const pageProps: PageSettings = {
      name: faker.random.word(),
      matcher: faker.random.word()
    };

    // Act
    const page = dynamicRender.page(pageProps);

    // Assert
    expect(page).to.be.instanceOf(Page);
  });

  it('should register new application', () => {
    // Arrange
    const applicationProps: ApplicationConfig = {
      origin: faker.random.word(),
      pages: []
    };
    const applicationName = faker.random.word();

    // Act
    dynamicRender.application(applicationName, applicationProps);

    // Assert
    const application = dynamicRender.applications.get(applicationName);
    expect(application).to.be.instanceOf(Application);
    expect(application!.configuration).to.include(applicationProps);
  });

  it('should return application status', () => {
    // Arrange
    const applicationProps: ApplicationConfig = {
      origin: faker.random.word(),
      pages: []
    };
    const applicationName = faker.random.word();
    const request = createExpressRequestMock(sandbox);
    const response = createExpressResponseMock(sandbox);

    // Act
    dynamicRender.application(applicationName, applicationProps);
    dynamicRender.status(request, response);

    // Assert
    expect(response.json.calledOnce).to.eq(true);
    expect(response.json.calledWith({
      [applicationName]: dynamicRender.applications.get(applicationName)!.toJSON()
    })).to.eq(true);
  });

  it('should init all applications', async () => {
    // Arrange
    const applicationProps: ApplicationConfig = {
      origin: faker.random.word(),
      pages: []
    };
    const applicationName = faker.random.word();
    dynamicRender.application(applicationName, applicationProps);
    const application = dynamicRender.applications.get(applicationName);
    const router = application!.router;
    serverMock
      .expects('router')
      .withExactArgs(`/render/${applicationName}`, router);
    serverMock
      .expects('listen')
      .withExactArgs(8080);
    engineMock.expects('init');
    const initStub = sandbox.stub(application!, 'init');

    // Act

    await dynamicRender.start();

    // Assert
    expect(initStub.calledOnce).to.eq(true);
    expect(initStub.calledWithExactly()).to.eq(true);
  });

  it('should init as worker', async () => {
    // Arrange
    const applicationProps: PrerenderDefaultConfiguration = {
      puppeteer: {
        [faker.random.word()]: faker.random.word()
      }
    } as any;
    const initStub = sandbox.stub(renderer, 'init');

    const dynamicRender = new DynamicRender(server, renderer);

    // Act
    await dynamicRender.startAsWorker(applicationProps as any);

    // Assert
    expect(initStub.firstCall.args[0]).to.include(applicationProps.puppeteer);
  });

  it('should render as worker succesfully', async () => {
    // Arrange
    const applicationName = faker.random.word();
    const pageName = faker.random.word();
    const origin = faker.random.word();
    const path = faker.random.word();
    const dynamicRender = new DynamicRender(server, renderer);
    const renderOptions = {
      page: pageName,
      application: applicationName,
      path: path
    } as WorkerRenderOptions;

    const response = faker.random.word();
    const handleAsWorkerStub = sandbox.stub().resolves(response);

    dynamicRender.applications.set(applicationName, {
      configuration: {
        origin,
        pages: [{
          handleAsWorker: handleAsWorkerStub,
          configuration: {
            name: pageName
          }
        }]
      }
    } as any);


    // Act
    const renderResponse = await dynamicRender.renderAsWorker(renderOptions);

    // Assert
    expect(handleAsWorkerStub.calledWithExactly(origin, path, undefined)).to.eq(true);
    expect(renderResponse).to.eq(response);
  });


  it('should render as worker when page not found', async () => {
    // Arrange
    const applicationName = faker.random.word();
    const pageName = faker.random.word();
    const origin = faker.random.word();
    const path = faker.random.word();
    const dynamicRender = new DynamicRender(server, renderer);
    const renderOptions = {
      page: pageName,
      application: applicationName,
      path: path
    } as WorkerRenderOptions;


    dynamicRender.applications.set(applicationName, {
      configuration: {
        origin,
        pages: []
      }
    } as any);


    // Act
    const renderResponse = await dynamicRender.renderAsWorker(renderOptions);

    // Assert
    expect(renderResponse).to.eq(undefined);
  });

  it('should render as worker when application not found', async () => {
    // Arrange
    const applicationName = faker.random.word();
    const pageName = faker.random.word();
    const path = faker.random.word();
    const dynamicRender = new DynamicRender(server, renderer);
    const renderOptions = {
      page: pageName,
      application: applicationName,
      path: path
    } as WorkerRenderOptions;


    // Act
    const renderResponse = await dynamicRender.renderAsWorker(renderOptions);

    // Assert
    expect(renderResponse).to.eq(undefined);
  });
});
