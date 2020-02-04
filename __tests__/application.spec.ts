import * as sinon from "sinon";
import * as faker from "faker";
import {expect} from "chai";
import {Application, ApplicationConfig} from "../src/application";
import express from "express";
import {createExpressRequestMock, createExpressResponseMock} from "./helpers";

const sandbox = sinon.createSandbox();
let application: Application;

const throwErrorMock = () => {
  console.trace();
  throw new Error(`Mocked method call`);
};

describe('[application.ts]', () => {
  beforeEach(() => {
    const configuration = {
      origin: faker.internet.url(),
      pages: []
    };

    application = new Application(configuration);
  });

  afterEach(() => {
    sandbox.verifyAndRestore();
  });

  it('should create new Application', () => {
    // Arrange
    const configuration = {
      origin: faker.internet.url(),
      pages: []
    };

    const application = new Application(configuration);

    // Assert
    expect(application).to.be.instanceOf(Application);
  });

  it('should convert application to json', () => {
    // Arrange
    const configuration: ApplicationConfig = {
      origin: faker.internet.url(),
      pages: [],
      emulateOptions: {
        userAgent: faker.random.word()
      }
    };

    const application = new Application(configuration);

    // Act
    const json = JSON.stringify(application);

    // Assert
    expect(json).to.eq(JSON.stringify({
      pages: [],
      emulateOptions: {
        userAgent: configuration.emulateOptions!.userAgent
      }
    }));
  });

  it('should start application by adding routes', async () => {
    // Arrange
    const configuration: ApplicationConfig = {
      origin: faker.internet.url(),
      pages: [{
        configuration: {
          matcher: faker.random.word(),
          name: faker.random.word(),
        },
        handle: {}
      } as any],
      emulateOptions: {
        userAgent: faker.random.word()
      }
    };

    const router = {
      get: throwErrorMock,
      use: throwErrorMock
    };

    const routerMock = sandbox.mock(router);


    routerMock
      .expects('get')
      .once()
      .withExactArgs(configuration.pages[0].configuration.matcher, configuration.pages[0].handle);

    sandbox
      .stub(express, 'Router')
      .returns(router as any);

    const application = new Application(configuration);

    routerMock
      .expects('use')
      .once()
      .withExactArgs(application.applicationInfoMiddleware);



    // Act
    await application.init();
  });

  it('should handle application status response', () => {
    // Arrange
    const configuration: ApplicationConfig = {
      origin: faker.internet.url(),
      pages: [],
      emulateOptions: {
        userAgent: faker.random.word()
      }
    };

    const application = new Application(configuration);
    const requestMock = createExpressRequestMock(sandbox);
    const responseMock = createExpressResponseMock(sandbox);

    // Act
    application.handleStatus(requestMock, responseMock);

    // Assert
    expect(responseMock.json.calledWithExactly(application.configuration)).to.eq(true);
  });

  it('should add application information for page and render engine', () => {
    // Arrange
    const configuration: ApplicationConfig = {
      origin: faker.internet.url(),
      pages: [],
      emulateOptions: {
        userAgent: faker.random.word()
      }
    };

    const application = new Application(configuration);
    const requestMock = createExpressRequestMock(sandbox);
    const responseMock = createExpressResponseMock(sandbox);
    const next = sandbox.stub();

    // Act
    application.applicationInfoMiddleware(requestMock, responseMock, next);

    // Assert
    expect(next.calledOnce).to.eq(true);
    expect(requestMock.application).to.deep.eq({
      origin: application.configuration.origin,
      emulateOptions: application.configuration.emulateOptions
    })
  });

  describe('should connect and init plugins', () => {
    it('should connect and init plugins with on start ', async () => {
      // Arrange
      const plugin = {
        onBeforeStart: sandbox.stub().resolves()
      };
      const configuration: ApplicationConfig = {
        origin: faker.internet.url(),
        pages: [{
          configuration: {
            matcher: faker.random.word(),
            name: faker.random.word(),
          },
          handle: {}
        } as any],
        emulateOptions: {
          userAgent: faker.random.word()
        },
        plugins: [
          plugin
        ]
      };

      const routerMock = {
        get: sandbox.stub(),
        use: sandbox.stub()
      };

      sandbox.stub(express, 'Router').returns(routerMock as any);

      const application = new Application(configuration);

      // Act
      await application.init();

      // Assert
      expect(plugin.onBeforeStart.calledOnce).to.eq(true);
      expect(routerMock.use.calledWithExactly(application.applicationInfoMiddleware)).to.eq(true);
      expect(routerMock.get.calledWithExactly(configuration.pages[0].configuration.matcher, configuration.pages[0].handle)).to.eq(true);
    });

    it('should connect and init plugins without on start ', async () => {
      // Arrange
      const plugin = {};
      const configuration: ApplicationConfig = {
        origin: faker.internet.url(),
        pages: [{
          configuration: {
            matcher: faker.random.word(),
            name: faker.random.word(),
          },
          handle: {}
        } as any],
        emulateOptions: {
          userAgent: faker.random.word()
        },
        plugins: [
          plugin
        ]
      };

      const routerMock = {
        get: sandbox.stub(),
        use: sandbox.stub()
      };

      sandbox.stub(express, 'Router').returns(routerMock as any);

      const application = new Application(configuration);

      // Act
      await application.init();

      // Assert
      expect(routerMock.use.calledWithExactly(application.applicationInfoMiddleware)).to.eq(true);
      expect(routerMock.get.calledWith(configuration.pages[0].configuration.matcher, configuration.pages[0].handle)).to.eq(true);
    });
  });
});
