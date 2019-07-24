import {Request} from "puppeteer";

class Hook {
  async process(doc: any){

  }
}

class Interceptor {
  intercept(request: Request){

  }
}

class Page {
  interceptors: Interceptor[];
  hooks: Hook[]
}
