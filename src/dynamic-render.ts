import {Server, ServerConfiguration} from "./server";
import {Renderer} from "./renderer";
import {Page, PageSettings} from "./page";
import {Application, ApplicationConfig} from "./application";
import {Hook, HookConfigration} from "./hook";
import {Interceptor, InterceptorConfiguration} from "./interceptor";
import express from "express";


interface PrerenderDefaultConfiguration extends ServerConfiguration {

}

const defaultConfiguration = {
  port: 8080
};

class DynamicRender {
  private applications: Map<string, Application> = new Map();
  private configuration: PrerenderDefaultConfiguration;
  private server: Server;

  private readonly renderer: Renderer;

  constructor(
    server: Server,
    renderer: Renderer,
    configuration?: PrerenderDefaultConfiguration
  ) {
    this.configuration = Object.assign(defaultConfiguration, configuration);
    this.server = server;
    this.renderer = renderer;

    this.server.register('/', 'get', this.status.bind(this));
  }

  async start() {
    await this.renderer.init();
    await this.registerApplications();
    return this.server.listen(this.configuration.port);
  }

  hook(configuration: HookConfigration): Hook {
    return new Hook(configuration);
  }

  interceptor(configuration: InterceptorConfiguration): Interceptor {
    return new Interceptor(configuration);
  }

  page(pageSettings: PageSettings): Page {
    return new Page(pageSettings, this.renderer);
  }

  application(name: string, configuration: ApplicationConfig) {
    this.applications.set(name, new Application(configuration));
  }

  private status(_: express.Request, res: express.Response) {
    res.json([...this.applications])
  }

  private async registerApplications() {
    for (let [name, application] of this.applications.entries()) {
      await application.init();
      this.server.router(`/render/${name}`, application.router);
    }
  }
}


export {
  DynamicRender
}

