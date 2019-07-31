import {expect} from "chai";
import dynamicRender from "../src";
import {DynamicRender} from "../src/dynamic-render";


describe('[index.ts]', () => {
  it('should export Dynamic Render instance', () => {
    // Assert
    expect(dynamicRender).to.be.instanceOf(DynamicRender);
  });
});
