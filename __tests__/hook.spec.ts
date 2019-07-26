import * as sinon from "sinon";
import * as faker from "faker";
import {expect} from "chai";
import {Hook, HookConfiguration} from "../src/hook";

const sandbox = sinon.createSandbox();
let hook: Hook;

describe('[hook.ts]', () => {
  beforeEach(() => {
    hook = new Hook({
      name: faker.random.word(),
      handler: sandbox.stub()
    })
  });

  afterEach(() => {
    sandbox.verifyAndRestore();
  });

  it('should create new Hook', () => {
    // Arrange
    const options: HookConfiguration = {
      name: faker.random.word(),
      handler: sandbox.stub()
    };
    const hook = new Hook(options);

    // Assert
    expect(hook).to.be.instanceOf(Hook);
  });

  it('should call handler on handle method', async () => {
    // Arrange
    const options = {
      name: faker.random.word(),
      handler:sandbox.stub()
    };
    const hook = new Hook(options);
    const page = {} as any;

    // Act
    await hook.handle(page);

    // Assert
    expect(options.handler.calledWithExactly(page)).to.eq(true);
  });
});
