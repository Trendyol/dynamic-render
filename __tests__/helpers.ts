import {SinonSandbox, SinonStub} from "sinon";

export const createExpressResponseMock = (sandbox: SinonSandbox, props?: Record<string, SinonStub>) => ({
  json: sandbox.stub().returnsThis(),
  send: sandbox.stub().returnsThis(),
  end: sandbox.stub(),
  set: sandbox.stub().returnsThis(),
  write: sandbox.stub().returnsThis(),
  status: sandbox.stub().returnsThis(),
  headers: sandbox.stub().returnsThis(),
  html: sandbox.stub().returnsThis(),
  setHeader: sandbox.stub(),
  ...props
}) as any;

export const createExpressRequestMock = (sandbox: SinonSandbox) => ({
  query: {},
  cookies: {}
}) as any;

export const createPuppeteerRequest = (sandbox: SinonSandbox, props?: Record<string, SinonStub>) => ({
  url: sandbox.stub(),
  respond: sandbox.stub(),
  resourceType: sandbox.stub(),
  method: sandbox.stub(),
  continue: sandbox.stub(),
  abort: sandbox.stub(),
  request: sandbox.stub(),
  isNavigationRequest: sandbox.stub(),
  ...props
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
