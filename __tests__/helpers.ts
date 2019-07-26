import {SinonSandbox} from "sinon";

export const createExpressResponseMock = (sandbox: SinonSandbox) => ({
  json: sandbox.stub(),
  send: sandbox.stub(),
  end: sandbox.stub(),
  write: sandbox.stub()
}) as any;

export const createExpressRequestMock = (sandbox: SinonSandbox) => ({
  query: {},
  cookies: {}
}) as any;
