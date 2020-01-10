import puppeteer from "puppeteer";

interface ResourceCacheContent {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
  expires: number;
}

class ResponseCache {
  cache: Map<string, ResourceCacheContent> = new Map();

  async setCache(response: puppeteer.Response) {
    const url = response.url();
    const headers = response.headers();
    const maxAge = this.getMaxAge(headers['cache-control']);

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

        // todo leak
        expires: Date.now() + (maxAge * 1000),
      });
    }
  }

  async request(request: puppeteer.Request) {
    const url = request.url();
    const cacheEntry = this.cache.get(url);
    if (cacheEntry && cacheEntry.expires > Date.now()) {
      await request.respond(cacheEntry);
      return true;
    } else {
      return false;
    }
  }

  private getMaxAge(headerString: string | undefined): number | null {
    if (!headerString) return null;

    const maxAgeMatch = headerString.match(/max-age=(\d+)/);

    if (!maxAgeMatch) return null;

    return +maxAgeMatch[1];
  }
}

export {
  ResponseCache
}
