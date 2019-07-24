import * as sinon from "sinon";
import {SinonMock} from "sinon";
import {expect} from "chai";
import {Page} from "../src/page";
import {Renderer} from "../src/renderer";
import * as faker from "faker";
import puppeteer, { Request } from "puppeteer";

const sandbox = sinon.createSandbox();
let page: Page;

const renderer = new Renderer();

let rendererMock: SinonMock;

describe('[page.ts]', () => {
  const defaultConfiguration = {matcher: faker.random.word()};

  beforeEach(() => {
    rendererMock = sandbox.mock(renderer);
    page = new Page(defaultConfiguration, renderer);
  });

  afterEach(() => {
    sandbox.verifyAndRestore();
  });

  it('should create new Page', () => {
    // Arrange
    const page = new Page(defaultConfiguration, renderer);

    // Assert
    expect(page).to.be.instanceOf(Page);
  });

  it('should intercept requests with registered interceptors', () => {
    // Arrange
    const interceptor = sandbox.stub();
    const interceptor2 = sandbox.stub();
    const pageConfiguration = {...defaultConfiguration, interceptors:[interceptor, interceptor2]};
    const request = {} as unknown as Request;

    const page = new Page(pageConfiguration, renderer);

    // Act
    page.intercept(request);

    // Assert
    expect(interceptor.calledWithExactly(request)).to.eq(true);
    expect(interceptor2.calledWithExactly(request)).to.eq(true);
  });

  it('should intercept requests with registered hooks', async () => {
    // Arrange
    const hook = sandbox.stub().resolves();
    const hook2 = sandbox.stub().resolves();
    const pageConfiguration = {...defaultConfiguration, hooks:[hook, hook2]};
    const browserPage = {} as unknown as puppeteer.Page;

    const page = new Page(pageConfiguration, renderer);

    // Act
    await page.hook(browserPage);

    // Assert
    expect(hook.calledWithExactly(browserPage)).to.eq(true);
    expect(hook2.calledWithExactly(browserPage)).to.eq(true);
  });
});
