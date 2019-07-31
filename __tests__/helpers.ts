import {SinonSandbox, SinonStub} from "sinon";

export const createExpressResponseMock = (sandbox: SinonSandbox) => ({
  json: sandbox.stub().returnsThis(),
  send: sandbox.stub().returnsThis(),
  end: sandbox.stub(),
  write: sandbox.stub().returnsThis(),
  status: sandbox.stub().returnsThis()
}) as any;

export const createExpressRequestMock = (sandbox: SinonSandbox) => ({
  query: {},
  cookies: {}
}) as any;

export const createPuppeteerRequest = (sandbox: SinonSandbox, props?: Record<string, SinonStub>) => ({
  url: sandbox.stub(),
  respond: sandbox.stub(),
  request: sandbox.stub()
}) as any;

export const createPuppeteerResponse = (sandbox: SinonSandbox, props?: Record<string, SinonStub>) => ({
  url: sandbox.stub(),
  headers: sandbox.stub(),
  status: sandbox.stub(),
  buffer: sandbox.stub(),
  ...props
}) as any;

export const createInterceptor = (sandbox: SinonSandbox, props?: Record<string, SinonStub>) => ({
  handle: sandbox.stub(),
  ...props
});
