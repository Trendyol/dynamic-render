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

  }

  init() {
    this.router.use((req: ApplicationRequest, res, next) => {
      req.application = {
        origin: this.configuration.origin,
        emulateOptions: this.configuration.emulateOptions
      };
      next();
    });
    this.router.get('/', (req, res) => {
      res.json(this.configuration);
    });
    this.configuration.pages.forEach(page => {
      this.router.get(page.configuration.matcher, page.handle);
    });
  }
}

export {
  ApplicationRequest,
  ApplicationConfig,
  Application
}


