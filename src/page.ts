import puppeteer, {EmulateOptions, LoadEvent, Request} from "puppeteer";
import {Hook} from "./hook";
import express from "express";
import {Interceptor} from "./interceptor";
import {ApplicationRequest} from "./application";
import {Renderer} from "./renderer";
import {Omit} from "yargs";


interface PageSettings {
  name: string;
  hooks?: Hook[];
  interceptors?: Interceptor[];
  matcher: string | RegExp | string[] | RegExp[];
  emulateOptions?: EmulateOptions;
  waitMethod?: LoadEvent
}

const defaultPageSettings: Omit<Required<PageSettings>, "matcher" | "name"> = {
  hooks: [],
  interceptors: [],
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
  private renderer: Renderer;

  constructor(
    configuration: PageSettings,
    renderer: Renderer
  ) {
    this.configuration = Object.assign(defaultPageSettings, configuration);

    this.hook = this.hook.bind(this);
    this.handle = this.handle.bind(this);
    this.renderer = renderer;
  }

  async hook(page: puppeteer.Page) {
    for (let i = 0, len = this.configuration.hooks.length; i < len; i++) {
      await this.configuration.hooks[i].handle(page);
    }
  }

  async handle(req: ApplicationRequest, res: express.Response) {
    const content = await this.renderer.render(this.configuration.emulateOptions!, `${req.application!.origin}${req.url}`, this.configuration.interceptors, this.configuration.hooks);
    res.send(content);
  }
}

export {
  PageSettings,
  Page
}
