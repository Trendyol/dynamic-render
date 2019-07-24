import {DynamicRender} from "./dynamic-render";
import {Server} from "./server";
import {Renderer} from "./renderer";
import fs from "fs";
import * as path from "path";

const server = new Server();
const renderer = new Renderer();


const placeholderPng = fs.readFileSync(path.join(__dirname, './png_placeholder'));
const placeholderJpg = fs.readFileSync(path.join(__dirname, './jpg_placeholder'));


const prerender = new DynamicRender(server, renderer, {
  port: 8080,
});

const clearCss = prerender.hook({
  name: 'Clear Css',
  handler: async page => {
    await page.evaluate(() => {
      // Remove Inline css
      const elements = document.querySelectorAll('*');
      for (let i = 0; i < elements.length; i++) {
        const target = elements[i];
        if ((target.tagName === 'STYLE' || target.tagName === 'SCRIPT') && target.parentNode) {
          target.parentNode.removeChild(target);
        }
        target.removeAttribute("style");
      }

      const linksStyles = document.querySelectorAll('link[rel="stylesheet"]');
      for (let i = 0; i < linksStyles.length; i++) {
        const element = linksStyles[i];
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }
    });
  }
});


const imageInterceptor = prerender.interceptor({
  name: 'Image Interceptor',
  handler: (req, respond) => {
    const url = req.url();
    if (url.endsWith('png')) {
      respond({
        body: placeholderPng,
        contentType: 'image/png'
      })
    } else if (url.endsWith('jpg')) {
      respond({
        body: placeholderJpg,
        contentType: 'image/jpeg'
      })
    }
  }
});

const xhrInterceptor = prerender.interceptor({
  name: 'Xhr Interceptor',
  handler: (req, respond, abort) => {
    const url = req.url();
    if (url.includes('reviewIds')) {
      respond({
        body: '{"reviewIdAndLikeCountMap":{},"likedReviewIds":[]}'
      })
    }
  }
});

const cssInterceptor = prerender.interceptor({
  name: 'Css Interceptor',
  handler: (req, respond) => {
    const url = req.url();
    if (url.endsWith('css')) {
      respond({
        body: '',
      })
    }
  }
});

const jsInterceptor = prerender.interceptor({
  name: 'Script Interceptor',
  handler: (req, respond) => {
    const url = req.url();
    const excludedPatterns = [
      'webpush',
      'sw.js',
      'delphoi',
      'gtm.service',
      'nr-',
      'enhanced.bundle'
    ];
    if (url.endsWith('js') && excludedPatterns.some(p => url.includes(p))) {
      respond({
        body: '',
      })
    }
  }
});

const lazyImageReplacer = prerender.hook({
  name: 'Replace Lazy Images',
  handler: (async page => {
    await page.evaluate(() => {
      const lazyImages = document.querySelectorAll('img[lazy]');
      for (let i = 0; i < lazyImages.length; i++) {
        const element = lazyImages[i];
        const lazySource = element.getAttribute('lazy');

        if (lazySource) {
          element.setAttribute('src', lazySource)
        }
      }
    });
  })
});


const productDetailPage = prerender.page({
  name: 'product-detail',
  hooks: [clearCss, lazyImageReplacer],
  interceptors: [jsInterceptor, imageInterceptor, cssInterceptor, xhrInterceptor],
  matcher: '/:brandName/:productName-p-:productContentId(\\d+)$'
});


prerender.application('mobile-web', {
  pages: [productDetailPage],
  origin: 'https://m.trendyol.com'
});


prerender
  .start()
  .then(port => {
    console.log(`Prerender listening on ${port}`);
  });
