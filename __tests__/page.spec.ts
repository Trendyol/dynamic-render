import * as sinon from "sinon";
import * as faker from "faker";
import {expect} from "chai";
import {Page, PageSettings} from "../src/page";
import {Engine} from "../src/engine";
import {SinonMock} from "sinon";
import {createExpressRequestMock, createExpressResponseMock} from "./helpers";
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

  // it('should handle server requests', async () => {
  //   // Arrange
  //   const request = createExpressRequestMock(sandbox);
  //   const response = createExpressResponseMock(sandbox);
  //   const renderData = faker.random.word();
  //
  //   request.application = {
  //     origin: faker.random.word()
  //   };
  //
  //   const configuration: PageSettings = {
  //     name: faker.random.word(),
  //     matcher: faker.random.word(),
  //     emulateOptions: {},
  //     interceptors: [],
  //     hooks: []
  //   };
  //
  //   request.url = faker.random.word();
  //
  //   engineMock
  //     .expects('render')
  //     // .withExactArgs(configuration.emulateOptions, `${request.application.origin}${request.url}`, configuration.interceptors, configuration.hooks)
  //     .resolves(renderData);
  //
  //   const page = new Page(configuration, engine);
  //
  //   // Acts
  //   await page.handle(request, response);
  //
  //   // Assert
  //   expect(response.send.calledWithExactly(renderData)).to.eq(true);
  // });

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
      emulateOptions: configuration.emulateOptions
    }))
  });
});
