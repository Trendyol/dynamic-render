import puppeteer from "puppeteer";

interface ResourceCacheContent {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
  t: NodeJS.Timeout;
}

class ResponseCache {
  cache: Map<string, ResourceCacheContent> = new Map();
  static validExtensions = ['js', 'css'];

  async setCache(response: puppeteer.Response) {
    const url = response.url();

    if (!url || !ResponseCache.validExtensions.some(extension => url.endsWith(extension))) {
      return;
    }

    const headers = response.headers();
    const status = response.status();
    const maxAge = this.getMaxAge(headers['cache-control']);
    const inCache = this.cache.get(url);

    if (maxAge && !inCache) {
      let buffer;
      try {
        buffer = await response.buffer();
      } catch (error) {
        return;
      }

      this.cache.set(url, {
        status,
        headers,
        body: buffer,
        t: setTimeout(() => {
          this.cache.delete(url);
        }, Math.min(maxAge * 1000, 2147483647))
      });
    }
  }

  async request(request: puppeteer.Request) {
    const url = request.url();
    if (!url || !ResponseCache.validExtensions.some(extension => url.endsWith(extension))) {
      return false;
    }

    const cacheEntry = this.cache.get(url);

    if (cacheEntry) {
      await request.respond(cacheEntry);
      return true;
    } else {
      return false;
    }
  }

  private getMaxAge(headerString: string | undefined): number | null {
    if (!headerString) return null;

    const maxAgeMatch = headerString.match(/max-age=(\d+)/i);

    if (!maxAgeMatch) return null;

    return +maxAgeMatch[1];
  }
}

export {
  ResponseCache
}
