import {EmulateOptions, LoadEvent} from "puppeteer";
import {Hook} from "./hook";
import express from "express";
import {Interceptor} from "./interceptor";
import {ApplicationRequest} from "./application";
import {Engine} from "./engine";
import {Omit} from "yargs";


interface PageSettings {
  name: string;
  hooks?: Hook[];
  interceptors?: Interceptor[];
  matcher: string | RegExp | string[] | RegExp[];
  emulateOptions?: EmulateOptions;
  waitMethod?: LoadEvent;
  cacheDurationSeconds?: number;
}

const defaultPageSettings: Omit<Required<PageSettings>, "matcher" | "name"> = {
  hooks: [],
  interceptors: [],
  cacheDurationSeconds: 0,
  emulateOptions: {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
    viewport: {
      width: 414,
      height: 736,
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      isLandscape: false
    }
  },
  waitMethod: "load"
};


class Page {
  readonly configuration: Required<PageSettings>;
  private readonly engine: Engine;

  constructor(
    configuration: PageSettings,
    engine: Engine
  ) {
    this.configuration = Object.assign(defaultPageSettings, configuration);

    this.handle = this.handle.bind(this);
    this.engine = engine;
  }

  async handle(req: ApplicationRequest, res: express.Response) {
    const content = await this.engine.render({
      emulateOptions: this.configuration.emulateOptions,
      url: `${req.application!.origin}${req.url}`,
      interceptors: this.configuration.interceptors,
      hooks: this.configuration.hooks,
      waitMethod: this.configuration.waitMethod
    });

    if (content.status === 200 && this.configuration.cacheDurationSeconds) {
      res.set('cache-control', `max-age=${this.configuration.cacheDurationSeconds}, public`);
    }

    res
      .status(content.status)
      .send(content.html);
  }

  toJSON() {
    return {
      matcher: this.configuration.matcher,
      interceptors: this.configuration.interceptors.map(i => i.name),
      hooks: this.configuration.hooks.map(i => i.name),
      waitMethod: this.configuration.waitMethod,
      emulateOptions: this.configuration.emulateOptions
    }
  }
}

export {
  PageSettings,
  Page
}
