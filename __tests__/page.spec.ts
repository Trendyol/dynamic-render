import * as sinon from "sinon";
import {SinonMock} from "sinon";
import * as faker from "faker";
import {expect} from "chai";
import {Page, PageSettings} from "../src/page";
import {Engine} from "../src/engine";
import {createExpressResponseMock} from "./helpers";
import {ResponseCache} from "../src/response-cache";

const sandbox = sinon.createSandbox();
const responseCache = new ResponseCache();
const engine = new Engine(responseCache);

let engineMock: SinonMock;
let page: Page;

describe('[page.ts]', () => {
  beforeEach(() => {
    engineMock = sandbox.mock(engine);

    const pageProps = {
      name: faker.random.word(),
      matcher: faker.random.word()
    };

    page = new Page(pageProps, engine);
  });

  afterEach(() => {
    sandbox.verifyAndRestore();
  });

  it('should create new Page', () => {
    // Arrange
    const pageProps = {
      name: faker.random.word(),
      matcher: faker.random.word()
    };
    const page = new Page(pageProps, engine);

    // Assert
    expect(page).to.be.instanceOf(Page);
  });

  it('should convert page to json', () => {
    // Arrange
    const configuration = {
      name: faker.random.word(),
      matcher: faker.random.word(),
      waitMethod: faker.random.word(),
      emulateOptions: {},
      interceptors: [{
        name: faker.random.word()
      }],
      hooks: [{
        name: faker.random.word()
      }]
    } as unknown as PageSettings;

    const page = new Page(configuration, engine);

    // Act
    const json = JSON.stringify(page);

    // Assert
    expect(json).to.eq(JSON.stringify({
      matcher: configuration.matcher,
      interceptors: [configuration.interceptors![0].name],
      hooks: [configuration.hooks![0].name],
      waitMethod: configuration.waitMethod,
      emulateOptions: configuration.emulateOptions,
      query: {}
    }))
  });

  it('should call engine for render with cache control', async () => {
    // Arrange
    const url = '/';
    const origin = faker.internet.url();
    const renderResponse = {
      status: 200,
      html: faker.random.word()
    };
    const response = createExpressResponseMock(sandbox);
    const request = {
      url,
      application: {
        origin
      },
    };

    const configuration = {
      emulateOptions: faker.random.word(),
      interceptors: [faker.random.word()],
      hooks: [faker.random.word()],
      waitMethod: faker.random.word(),
      cacheDurationSeconds: faker.random.number()
    };

    const page = new Page(configuration as any, engine);

    engineMock
      .expects('render')
      .withExactArgs({
        emulateOptions: configuration.emulateOptions,
        url: origin + url,
        interceptors: configuration.interceptors,
        hooks: configuration.hooks,
        waitMethod: configuration.waitMethod,
      })
      .resolves(renderResponse);

    // Act
    await page.handle(request as any, response);

    // Assert
    expect(response.set.calledWithExactly('cache-control', `max-age=${configuration.cacheDurationSeconds}, public`)).to.eq(true);
    expect(response.status.calledWithExactly(renderResponse.status)).to.eq(true);
    expect(response.send.calledWithExactly(renderResponse.html)).to.eq(true);
  });

  it('should call engine for render without cache control', async () => {
    // Arrange
    const url = '/';
    const origin = faker.internet.url();
    const renderResponse = {
      status: 404,
      html: faker.random.word()
    };
    const response = createExpressResponseMock(sandbox);
    const request = {
      url,
      application: {
        origin
      },
    };

    const query = {
      dr: true,
      test: false,
    }

    const configuration = {
      emulateOptions: faker.random.word(),
      interceptors: [faker.random.word()],
      hooks: [faker.random.word()],
      waitMethod: faker.random.word(),
      cacheDurationSeconds: faker.random.number(),
      query
    };

    const page = new Page(configuration as any, engine);

    engineMock
      .expects('render')
      .withExactArgs({
        emulateOptions: configuration.emulateOptions,
        url: origin + url + '?dr=true&test=false',
        interceptors: configuration.interceptors,
        hooks: configuration.hooks,
        waitMethod: configuration.waitMethod
      })
      .resolves(renderResponse);

    // Act
    await page.handle(request as any, response);

    // Assert
    expect(response.set.called).to.eq(false);
    expect(response.status.calledWithExactly(renderResponse.status)).to.eq(true);
    expect(response.send.calledWithExactly(renderResponse.html)).to.eq(true);
  });
});
