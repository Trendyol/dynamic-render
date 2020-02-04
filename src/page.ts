import {EmulateOptions, LoadEvent} from "puppeteer";
import {Hook} from "./hook";
import express from "express";
import {Interceptor} from "./interceptor";
import {ApplicationRequest} from "./application";
import {Engine, RenderResult} from "./engine";
import {Omit} from "yargs";
import {Plugin, PluginEvents} from "./types";

interface PageSettings {
  name: string;
  hooks?: Hook[];
  interceptors?: Interceptor[];
  matcher: string | RegExp | string[] | RegExp[];
  emulateOptions?: EmulateOptions;
  waitMethod?: LoadEvent;
  cacheDurationSeconds?: number;
  query?: object;
  followRedirects?: boolean;
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
  waitMethod: "load",
  query: {},
  followRedirects: true
};


class Page {
  readonly configuration: Required<PageSettings>;
  public plugins: Plugin[];
  private readonly engine: Engine;

  constructor(
    configuration: PageSettings,
    engine: Engine,
    plugins: Plugin[] = []
  ) {

    this.configuration = {
      ...defaultPageSettings,
      ...configuration
    };

    this.plugins = plugins;
    this.handle = this.handle.bind(this);
    this.engine = engine;
  }

  async handle(req: ApplicationRequest, res: express.Response) {
    const url = new URL(`${req.application!.origin}${req.url}`);


    for (const [key, value] of Object.entries(this.configuration.query))
      url.searchParams.append(key, value);

    const _url = url.toString();

    await this.runPlugins('onBeforeRender', this, _url, res);

    const content = await this.engine.render({
      emulateOptions: this.configuration.emulateOptions,
      url: _url,
      interceptors: this.configuration.interceptors,
      hooks: this.configuration.hooks,
      waitMethod: this.configuration.waitMethod,
      followRedirects: this.configuration.followRedirects
    });

    await this.runPlugins('onAfterRender', this, _url, res, content);

    this.handleRenderResponse(content, res);
  }

  private async runPlugins(timing: PluginEvents, page: Page, url: string, res: express.Response, content?: RenderResult) {
    const pluginHandler: Record<PluginEvents, (page: Page, url: string, res: express.Response, content?: RenderResult) => Promise<void | RenderResult>> = {
      onBeforeRender: async (page, req, res, content) => {
        for (let plugin of this.plugins) {
          if (plugin.onBeforeRender) {
            const pluginResponse = await plugin.onBeforeRender(this, url);

            if (pluginResponse) {
              return this.handleRenderResponse(pluginResponse, res);
            }
          }
        }
      },
      onAfterRender: async (page, url, res, content) => {
        await Promise.all(this.plugins.map(async plugin => {
          if (plugin.onAfterRender && content) {
            return plugin.onAfterRender(this, url, content);
          }
        }))
      }
    };

    return pluginHandler[timing](page, url, res, content);
  }

  private handleRenderResponse(content: RenderResult, res: express.Response) {
    if (content.status === 200 && this.configuration.cacheDurationSeconds) {
      res.set('cache-control', `max-age=${this.configuration.cacheDurationSeconds}, public`);
    }

    if (content.headers) {
      res
        .set(content.headers)
        .status(content.status)
        .end();
    } else {
      res
        .status(content.status)
        .send(content.html);
    }
  }

  toJSON() {
    return {
      matcher: this.configuration.matcher,
      interceptors: this.configuration.interceptors.map(i => i.name),
      hooks: this.configuration.hooks.map(i => i.name),
      waitMethod: this.configuration.waitMethod,
      emulateOptions: this.configuration.emulateOptions,
      query: this.configuration.query,
      followRedirects: this.configuration.followRedirects,
    }
  }
}

export {
  PageSettings,
  Page
}
