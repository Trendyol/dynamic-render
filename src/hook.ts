import {Page} from "puppeteer";

type HookHandler = (page: Page) => Promise<void>;

interface HookConfiguration {
  name: string;
  handler: HookHandler
}

class Hook {
  name: string;
  private readonly handler: HookHandler;

  constructor(configuration: HookConfiguration){
    this.handler = configuration.handler;
    this.name = configuration.name;

    this.handle = this.handle.bind(this);
  }


  async handle(page: Page){
    const startTime = process.hrtime();
    await this.handler(page);
    const hrend = process.hrtime(startTime);
    console.info(`${this.name} hook execution time (hr): %ds %dms`, hrend[0], hrend[1] / 1000000);
  }
}

export {
  HookHandler,
  HookConfiguration,
  Hook
}
