import puppeteer, {Browser, EmulateOptions, LoadEvent} from "puppeteer";
import {Interceptor} from "./interceptor";
import {Hook} from "./hook";
import {ResponseCache} from "./response-cache";

const emulateOptions: EmulateOptions = {
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
  viewport: {
    width: 414,
    height: 736,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    isLandscape: false
  }
};

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
    this.handleInterceptors = this.handleInterceptors.bind(this);
    this.onResponse = this.onResponse.bind(this);
    this.responseCache = responseCache;
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: true,
      ignoreHTTPSErrors: true,
      devtools: false
    });
  }

  async createPage(): Promise<puppeteer.Page> {
    const browserPage = await this.browser.newPage();
    await browserPage.emulate(emulateOptions);
    await (browserPage as any)._client.send('Network.setBypassServiceWorker', {bypass: true});
    await (browserPage as any)._client.send('Network.setCacheDisabled', {
      cacheDisabled: false
    });
    await browserPage.setRequestInterception(true);
    browserPage.on('request', this.onRequest);
    browserPage.on('response', this.onResponse);

    return browserPage;
  }

  async render(options: RenderOptions) {
    try {
      const browserPage = await this.createPage();
      const navigationResult = await browserPage.goto(options.url, {waitUntil: options.waitMethod});

      if (!!options.hooks) {
        for (const hook of options.hooks) await hook.handle(browserPage);
      }
      const pageContent = await browserPage.content();
      await browserPage.close();

      return {
        status: navigationResult ? navigationResult.status() : 404,
        html: pageContent
      };
    } catch (e) {
      return {
        status: 404,
        html: '',
        duration: 0
      }
    }
  }

  async handleInterceptors(interceptors: Interceptor[], request: puppeteer.Request) {
    let handled = false;

    for (let i = 0, len = interceptors.length; i < len; i++) {
      interceptors[i].handle(request, async (options) => {
        await request.respond(options);
        handled = true;
        return;
      }, () => {
        request.abort('blockedbyclient');
        handled = true;
        return;
      });
    }

    if (!handled) {
      await request.continue();
    }
  }

  async onResponse(response: puppeteer.Response) {
    await this.responseCache.setCache(response);
  }

  async onRequest(request: puppeteer.Request, interceptors: Interceptor[]) {
    if (await this.responseCache.request(request)) return;

    if (!!interceptors) {
      this.handleInterceptors(interceptors, request);
    } else {
      return request.continue();
    }
  }
}

export {
  Engine
}
