import puppeteer, {Browser, EmulateOptions, LoadEvent} from "puppeteer";
import {Interceptor} from "./interceptor";
import {Hook} from "./hook";
import {ResponseCache} from "./response-cache";

interface RenderOptions {
  emulateOptions: EmulateOptions,
  url: string,
  interceptors: Interceptor[],
  hooks: Hook[],
  waitMethod: LoadEvent
}

class Engine {
  private browser!: Browser;
  private responseCache: ResponseCache;

  constructor(
    responseCache: ResponseCache
  ) {
    this.responseCache = responseCache;

    this.handleInterceptors = this.handleInterceptors.bind(this);
    this.onResponse = this.onResponse.bind(this);
  }

  async init(config?: any) {
    this.browser = await puppeteer.launch({
      headless: true,
      ignoreHTTPSErrors: true,
      devtools: false,
      ...config
    });
  }

  async createPage(emulateOptions: EmulateOptions, interceptors: Interceptor[]): Promise<puppeteer.Page> {
    const browserPage = await this.browser.newPage();
    await browserPage.emulate(emulateOptions);
    await (browserPage as any)._client.send('Network.setBypassServiceWorker', {bypass: true});
    await (browserPage as any)._client.send('Network.setCacheDisabled', {
      cacheDisabled: false
    });
    await browserPage.setRequestInterception(true);
    browserPage.on('request', this.onRequest.bind(this, interceptors));
    browserPage.on('response', this.onResponse);

    return browserPage;
  }

  async render(options: RenderOptions) {
    let browserPage;
    const renderStatus = {
      status: 404,
      html: ''
    };

    try {
      browserPage = await this.createPage(options.emulateOptions, options.interceptors);
      const navigationResult = await browserPage.goto(options.url, {waitUntil: options.waitMethod});

      if (navigationResult) {
        if (typeof options.hooks != "undefined" && options.hooks.length > 0) {
          for (const hook of options.hooks) await hook.handle(browserPage);
        }
        const pageContent = await browserPage.content();
        renderStatus.status = navigationResult.status();
        renderStatus.html = pageContent;
      }
    } catch (e) {
      console.error(e);
    }

    if (browserPage) {
      await browserPage.close();
    }

    return renderStatus;
  }

  async handleInterceptors(interceptors: Interceptor[], request: puppeteer.Request) {
    let handled = false;
    let i = 0;

    while (!handled && i < interceptors.length) {
      interceptors[i++].handle(request, (options) => {
        request.respond(options);
        handled = true;
      }, () => {
        request.abort('blockedbyclient');
        handled = true;
      });
    }

    if (!handled) {
      await request.continue();
    }
  }

  async onResponse(response: puppeteer.Response) {
    await this.responseCache.setCache(response);
  }

  async onRequest(interceptors: Interceptor[], request: puppeteer.Request) {
    if (await this.responseCache.request(request)) return;

    if (typeof interceptors !== "undefined" && interceptors.length > 0) {
      this.handleInterceptors(interceptors, request);
    } else {
      return request.continue();
    }
  }
}

export {
  Engine
}
