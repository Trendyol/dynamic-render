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
    const startTime = process.hrtime();
    this.handler(req, respond, block);
    const hrend = process.hrtime(startTime);
    console.info(`${this.name} [${req.url()}] hook execution time (hr): %ds %dms`, hrend[0], hrend[1] / 1000000);
  }
}

export {
  InterceptorHandler,
  InterceptorConfiguration,
  Interceptor
}

