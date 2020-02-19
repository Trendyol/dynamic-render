import express, { Express, Request, Response, NextFunction, response} from "express";
import shrinkRayCurrent from "shrink-ray-current";

interface ServerConfiguration {
  port: number;
}

const setDynamicRenderHeader = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('x-powered-by', 'dynamic-rendering');
  next();
}

class Server {
  readonly app: Express;

  constructor() {
    this.app = express();

    this.app.use(shrinkRayCurrent());
    this.app.use(setDynamicRenderHeader);
  }

  listen(port: number) {
    return new Promise(resolve => {
      console.log('Server call');
      this.app.listen(port, () => {
        resolve(port);
      });
    });
  }

  register(path: string, method: string, handler: express.RequestHandler) {
    (this.app as any)[method](path, handler);
  }

  router(path: string, router: express.Router) {
    this.app.use(path, router);
  }
}

export {
  setDynamicRenderHeader,
  ServerConfiguration,
  Server
}


