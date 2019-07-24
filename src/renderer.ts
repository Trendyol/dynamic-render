import puppeteer, {Browser, EmulateOptions} from "puppeteer";
import {Interceptor} from "./interceptor";
import {Hook} from "./hook";


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

interface ResourceCacheContent {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
  expires: number;
}

class Renderer {
  private browser!: Browser;
  private cache: Map<string, ResourceCacheContent> = new Map();

  constructor() {
    this.handleInterceptors = this.handleInterceptors.bind(this);
    this.handleCacheResponse = this.handleCacheResponse.bind(this);
  }


  async init() {
    this.browser = await puppeteer.launch({
      headless: true,
      ignoreHTTPSErrors: true,
      devtools: false
    });
  }

  async render(options: EmulateOptions, url: string, interceptors?: Interceptor[], hooks?: Hook[]) {
    const startTime = process.hrtime();
    const browserPage = await this.browser.newPage();
    await browserPage.emulate(emulateOptions);

    (browserPage as any)._client.send('Network.setBypassServiceWorker', {bypass: true});
    (browserPage as any)._client.send('Network.setCacheDisabled', {
      cacheDisabled: false
    });


    await browserPage.setRequestInterception(true);

    browserPage.on('request', (request) => {
      if(this.handleCacheRequest(request)) return;


      if (!!interceptors) {
        this.handleInterceptors(interceptors, request);
      } else {
        return request.continue();
      }
    });

    browserPage.on('response', this.handleCacheResponse);

    await browserPage.goto(url, {waitUntil: 'load'});

    if (!!hooks) {
      await this.handleHooks(hooks, browserPage);
    }

    const pageContent = await browserPage.content();
    // await browserPage.close();
    const hrend = process.hrtime(startTime);
    console.info('Render time (hr): %ds %dms', hrend[0], hrend[1] / 1000000);
    return pageContent;
  }

  private handleInterceptors(interceptors: Interceptor[], request: puppeteer.Request) {
    let handled = false;

    for (let i = 0, len = interceptors.length; i < len; i++) {
      interceptors[i].handle(request, (options) => {
        console.info(`${interceptors[i].name} is responding to request ${request.url()}`);
        request.respond(options);
        handled = true;
        return;
      }, () => {
        console.warn(`${interceptors[i].name} is aborting request ${request.url()}`);
        request.abort('blockedbyclient');
        handled = true;
        return;
      });
    }

    if (!handled) {
      request.continue();
    }
  }

  private async handleHooks(hooks: Hook[], page: puppeteer.Page) {
    for (let i = 0, len = hooks.length; i < len; i++) {
      const startTime = process.hrtime();
      await hooks[i].handle(page);
      const hrend = process.hrtime(startTime);
      console.info(`${hooks[i].name} hook execution time (hr): %ds %dms`, hrend[0], hrend[1] / 1000000);
    }
  }

  private async handleCacheResponse(response: puppeteer.Response){
    const url = response.url();
    const headers = response.headers();
    const cacheControl = headers['cache-control'] || '';
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
    const maxAge = maxAgeMatch && maxAgeMatch.length > 1 ? parseInt(maxAgeMatch[1], 10) : 0;


    if (maxAge) {
      const cacheEntry = this.cache.get(url);
      if (cacheEntry && cacheEntry.expires < Date.now()) return;

      let buffer;
      try {
        buffer = await response.buffer();
      } catch (error) {
        return;
      }

      this.cache.set(url, {
        status: response.status(),
        headers: response.headers(),
        body: buffer,
        expires: Date.now() + (maxAge * 1000),
      });
    }
  }

  private handleCacheRequest(request: puppeteer.Request){
    const url = request.url();
    const cacheEntry = this.cache.get(url);

    if (cacheEntry && cacheEntry.expires > Date.now()){
      request.respond(cacheEntry);
      return true;
    }else{
      return false;
    }
  }
}

export {
  Renderer
}
