import puppeteer from "puppeteer";

interface ResourceCacheContent {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
  expires: number;
}

class ResponseCache {
  public readonly cache: Map<string, ResourceCacheContent> = new Map();

  public async setCache(response: puppeteer.Response): Promise<void> {
    const url = response.url();
    const headers = response.headers();
    const maxAge = ResponseCache.getMaxAge(headers['cache-control']);

    if (maxAge && !this.hasNonExpiredCache(url)) {
      try {
        const buffer = await response.buffer();
        this.cache.set(url, {
          body: buffer,
          status: response.status(),
          headers: headers,
          expires: Date.now() + (maxAge * 1000)
        });
      } catch (e) {
        // TODO: we should implement a logger.
      }
    }
  }

  public async request(request: puppeteer.Request): Promise<boolean> {
    const url = request.url();
    const cacheEntry = this.cache.get(url);
    if (cacheEntry) {
      if (!ResponseCache.isExpired(cacheEntry)) {
        await request.respond(cacheEntry);
        return true;
      } else {
        this.cache.delete(url);
      }
    }
    return false;
  }

  private hasNonExpiredCache(url: string): boolean {
    const cacheEntry = this.cache.get(url);
    return !!cacheEntry && !ResponseCache.isExpired(cacheEntry);
  }

  private static isExpired(cacheEntry: ResourceCacheContent): boolean {
    return cacheEntry.expires < Date.now();
  }

  private static getMaxAge(headerString: string | undefined): number | null {
    if (!headerString) {
      return null;
    }

    const maxAgeMatch = headerString.match(/max-age=(\d+)/);

    if (!maxAgeMatch) {
      return null;
    }

    return +maxAgeMatch[1];
  }
}

export {
  ResponseCache
}
