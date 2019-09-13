import {Page} from "./page";
import {EmulateOptions} from "puppeteer";
import express from "express";

interface ApplicationConfig {
  origin: string;
  pages: Page[];
  emulateOptions?: EmulateOptions;
}

interface ApplicationRequest extends express.Request {
  application?: {
    origin: string;
    emulateOptions?: EmulateOptions
  }
}

class Application {
  configuration: ApplicationConfig;
  router: express.Router;

  constructor(configuration: ApplicationConfig) {
    this.configuration = configuration;
    this.router = express.Router();

    this.applicationInfoMiddleware = this.applicationInfoMiddleware.bind(this);
    this.handleStatus = this.handleStatus.bind(this);
  }

  init() {
    this.router.use(this.applicationInfoMiddleware);
    this.configuration.pages.forEach(page => {
      this.router.get(page.configuration.matcher, page.handle);
    });
  }

  toJSON() {
    return {
      pages: this.configuration.pages,
      emulateOptions: this.configuration.emulateOptions
    }
  }

  applicationInfoMiddleware(req: ApplicationRequest, res: express.Response, next: express.NextFunction) {
    req.application = {
      origin: this.configuration.origin,
      emulateOptions: this.configuration.emulateOptions
    };
    next();
  }

  handleStatus(req: express.Request, res: express.Response) {
    res.json(this.configuration);
  }
}

export {
  ApplicationRequest,
  ApplicationConfig,
  Application
}


