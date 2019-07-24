import {Page} from "puppeteer";

type HookHandler = (page: Page) => Promise<void>;

interface HookConfigration {
  name: string;
  handler: HookHandler
}

class Hook {
  name: string;
  private readonly handler: HookHandler;

  constructor(configuration: HookConfigration){
    this.handler = configuration.handler;
    this.name = configuration.name;

    this.handle = this.handle.bind(this);
  }

  async handle(page: Page){
    await this.handler(page);
  }
}

export {
  HookHandler,
  HookConfigration,
  Hook
}
