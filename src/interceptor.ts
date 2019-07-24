import {Request, RespondOptions} from "puppeteer";

type InterceptorHandler = (req: Request, respond: (options: RespondOptions) => void, abort: () => void) => void;

interface InterceptorConfiguration {
  handler: InterceptorHandler,
  name: string
}

class Interceptor {
  name: string;
  private readonly handler: InterceptorHandler;

  constructor(configuration: InterceptorConfiguration) {
    this.handler = configuration.handler;
    this.name = configuration.name;

    this.handle = this.handle.bind(this);
  }

  handle(req: Request, respond: (options: RespondOptions) => void, block: () => void) {
    this.handler(req, respond, block);
  }
}

export {
  InterceptorHandler,
  InterceptorConfiguration,
  Interceptor
}
