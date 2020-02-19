import * as sinon from "sinon";
import * as faker from "faker";
import {expect} from "chai";
import {Server, setDynamicRenderHeader} from "../src/server";
import {createExpressRequestMock, createExpressResponseMock} from "./helpers";

const sandbox = sinon.createSandbox();
let server: Server;

describe('[server.ts]', () => {
  beforeEach(() => {
    server = new Server()
  });

  afterEach(() => {
    sandbox.verifyAndRestore();
  });

  it('should create new Server', () => {
    // Arrange
    const server = new Server();

    // Assert
    expect(server).to.be.instanceOf(Server);
  });

  it('should register new path', () => {
    // Arrange
    const path = faker.random.word();
    const method = 'get';
    const handler = sandbox.stub() as any;

    const appStub = sandbox.stub(server.app, method);

    // Act
    server.register(path, method, handler);

    // Assert
    expect(appStub.calledWithExactly(path, handler)).to.eq(true);
  });

  it('should register new router', () => {
    // Arrange
    const path = faker.random.word();
    const router = sandbox.stub() as any;
    const appStub = sandbox.stub(server.app, 'use');

    // Act
    server.router(path, router);

    // Assert
    expect(appStub.calledWithExactly(path, router)).to.eq(true);
  });

  it('should set dynamic rendering header', () => {
    const request = createExpressRequestMock(sandbox);
    const response = createExpressResponseMock(sandbox)
    const nextStub = sandbox.stub() as any;
    setDynamicRenderHeader(request, response, nextStub);
        
    expect(nextStub.calledWithExactly()).to.eq(true);
  });

  it('should start server and listen port', async () => {
    // Arrange
    const port = faker.random.number();
    const listenStub = sandbox.stub(server.app, 'listen').callsArg(1);

    // Act
    const portResolved = await server.listen(port);

    // Assert
    expect(listenStub.calledWithExactly(port, sinon.match.func)).to.eq(true);
    expect(portResolved).to.eq(port);
  });
});