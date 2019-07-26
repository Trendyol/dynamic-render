import * as sinon from "sinon";
import * as faker from "faker";
import {expect} from "chai";
import {Interceptor, InterceptorConfiguration} from "../src/interceptor";

const sandbox = sinon.createSandbox();
let interceptor: Interceptor;

describe('[interceptor.ts]', () => {
  beforeEach(() => {
    interceptor = new Interceptor({
      name: faker.random.word(),
      handler: sandbox.stub()
    })
  });

  afterEach(() => {
    sandbox.verifyAndRestore();
  });

  it('should create new Interceptor', () => {
    // Arrange
    const options: InterceptorConfiguration = {
      name: faker.random.word(),
      handler: sandbox.stub()
    };
    const interceptor = new Interceptor(options);

    // Assert
    expect(interceptor).to.be.instanceOf(Interceptor);
  });

  it('should call handler on handle method', async () => {
    // Arrange
    const options = {
      name: faker.random.word(),
      handler:sandbox.stub()
    };
    const interceptor = new Interceptor(options);
    const request = {} as any;
    const block = sandbox.stub();
    const respond = sandbox.stub();

    // Act
    await interceptor.handle(request, respond, block);

    // Assert
    expect(options.handler.calledWithExactly(request, respond, block)).to.eq(true);
  });
});
