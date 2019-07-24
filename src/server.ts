import express, {Express} from "express";
import {Page} from "./page";
import shrinkRayCurrent from "shrink-ray-current";

interface ServerConfiguration {
  port: number;
}

class Server {
  private readonly app: Express;

  constructor(){
    this.app = express();

    this.app.use(shrinkRayCurrent());
  }

  listen(port: number){
    return new Promise(resolve => {
      this.app.listen(port, () => {
        resolve(port);
      });
    });
  }

  addPage(applicationName: string, page: Page){
    // this.app.get(`/handle/${applicationName}${page.configuration.matcher}`, async (req, res) => {
    //
    //
    // });
  }

  register(path: string, method: string, handler: express.RequestHandler){
    (this.app as any)[method](path, handler);
  }

  router(path: string, router: express.Router){
    this.app.use(path, router);
  }
}

export {
  ServerConfiguration,
  Server
}
