import * as sinon from "sinon";
import {SinonMock} from "sinon";
import {expect} from "chai";
import {DynamicRender} from "../src/dynamic-render";
import {Server} from "../src/server";
import {Renderer} from "../src/renderer";
import faker from "faker";
import {Page} from "../src/page";

const sandbox = sinon.createSandbox();

const server = new Server();
const renderer = new Renderer();

let dynamicRender: DynamicRender;

let serverMock: SinonMock;
let rendererMock: SinonMock;

describe('[prerender.ts]', () => {
  beforeEach(() => {
    serverMock = sandbox.mock(server);
    rendererMock = sandbox.mock(renderer);
    dynamicRender = new DynamicRender(server, renderer);
  });

  afterEach(() => {
    sandbox.verifyAndRestore();
  });

  it('should create new DynamicRender', () => {
    // Arrange
    const prerender = new DynamicRender(server, renderer);

    // Assert
    expect(prerender).to.be.instanceOf(DynamicRender);
  });

  it('should start server', async () => {
    // Arrange
    const port = faker.random.number();
    serverMock.expects('listen').withExactArgs(port).resolves(port);

    const prerender = new DynamicRender(server, renderer, {port});

    // Act
    await prerender.start();
  });

  it('should register new hook', () => {
    // Arrange
    const name = faker.random.word();
    const hook = sandbox.stub();

    // Act
    dynamicRender.registerHook(name, hook);

    // Assert
    expect(dynamicRender.hooks.get(name)).to.eq(hook);
  });

  it('should register new interceptor', () => {
    // Arrange
    const name = faker.random.word();
    const interceptor = sandbox.stub();

    // Act
    dynamicRender.registerInterceptor(name, interceptor);

    // Assert
    expect(dynamicRender.interceptors.get(name)).to.eq(interceptor);
  });

  it('should register new page', () => {
    // Arrange
    const name = faker.random.word();
    const page = {} as any;

    // Act
    dynamicRender.registerPage(name, page);

    // Assert
    expect(dynamicRender.pages.get(name)).to.eq(page);
  });


  it('should register new application', () => {
    // Arrange
    const applicationName = faker.random.word();
    const pageName = faker.random.word();
    dynamicRender.registerPage(pageName, {
      matcher: faker.random.word()
    });

    serverMock.expects('addPage').withExactArgs(applicationName, sinon.match.instanceOf(Page));

    // Act
    dynamicRender.registerApplication(applicationName, [pageName]);
  });


  it('should not register new application if application name not exists', () => {
    // Arrange
    const applicationName = faker.random.word();

    serverMock.expects('addPage').never();

    // Act
    dynamicRender.registerApplication(applicationName, [faker.random.word()]);
  });
});
