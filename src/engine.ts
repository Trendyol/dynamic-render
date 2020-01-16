import puppeteer, {Browser, EmulateOptions, LoadEvent, LaunchOptions} from "puppeteer";
import {Interceptor} from "./interceptor";
import {Hook} from "./hook";
import {ResponseCache} from "./response-cache";

interface CustomPage extends puppeteer.Page {
  redirect?: puppeteer.Response
}

interface RenderOptions {
  emulateOptions: EmulateOptions,
  url: string,
  interceptors: Interceptor[],
  hooks: Hook[],
  waitMethod: LoadEvent,
  followRedirects: boolean,
}

class Engine {
  private browser!: Browser;
  private responseCache: ResponseCache;

  constructor(
    responseCache: ResponseCache,
  ) {
    this.responseCache = responseCache;
    this.handleInterceptors = this.handleInterceptors.bind(this);
    this.onResponse = this.onResponse.bind(this);
    this.onRequest = this.onRequest.bind(this);
  }

  async init(config?: Partial<LaunchOptions>) {
    this.browser = await puppeteer.launch({
      headless: true,
      ignoreHTTPSErrors: true,
      devtools: false,
      ...config
    });
  }

  async createPage(emulateOptions: EmulateOptions, interceptors: Interceptor[], followRedirects: boolean): Promise<CustomPage> {
    const browserPage = await this.browser.newPage();
    await browserPage.emulate(emulateOptions);
    await (browserPage as any)._client.send('Network.setBypassServiceWorker', {bypass: true});
    await (browserPage as any)._client.send('Network.setCacheDisabled', {
      cacheDisabled: false
    });
    await browserPage.setRequestInterception(true);

    browserPage.on('request', (request) => this.onRequest(request, interceptors, browserPage, followRedirects));
    browserPage.on('response', this.onResponse);
    return browserPage;
  }

  async render(options: RenderOptions) {
    let browserPage;
    const renderStatus: {
      status: number,
      html?: string,
      headers?: Record<string, string>, 
    } = {
      status: 404,
      html: ''
    };

    try {
      browserPage = await this.createPage(options.emulateOptions, options.interceptors, options.followRedirects);
    } catch (error) {
      return renderStatus;
    }

    try {
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
      if (options.followRedirects && browserPage.redirect) {
        const redirectRequest = browserPage.redirect;
        const headers = redirectRequest.headers();
        const status = redirectRequest.status();
        headers.location = headers.location.replace(/\??dr=true/, '');
        renderStatus.status = status;
        renderStatus.headers = headers;
      }
    }


    await browserPage.close();


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

  async onRequest(request: puppeteer.Request, interceptors: Interceptor[], browserPage: CustomPage, followRedirects: boolean) {
    if (followRedirects && request.isNavigationRequest() && request.redirectChain().length && request.resourceType() === 'document') {
      (browserPage.redirect as any) = request.redirectChain()[0].response();
      return request.abort()
    }

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
