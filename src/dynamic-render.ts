import {Server, ServerConfiguration} from "./server";
import {Renderer} from "./renderer";
import {Page, PageSettings} from "./page";
import {Application, ApplicationConfig} from "./application";
import {Hook, HookConfiguration} from "./hook";
import {Interceptor, InterceptorConfiguration} from "./interceptor";
import express from "express";


interface PrerenderDefaultConfiguration extends ServerConfiguration {

}

const defaultConfiguration = {
  port: 8080
};

class DynamicRender {
  applications: Map<string, Application> = new Map();
  configuration: PrerenderDefaultConfiguration;
  private server: Server;

  private readonly renderer: Renderer;

  constructor(
    server: Server,
    renderer: Renderer,
  ) {
    this.configuration = defaultConfiguration;
    this.server = server;
    this.renderer = renderer;

    this.server.register('/', 'get', this.status.bind(this));
  }

  async start(configuration?: PrerenderDefaultConfiguration) {
    this.configuration = Object.assign(this.configuration, configuration);
    await this.renderer.init();
    await this.registerApplications();
    return this.server.listen(this.configuration.port);
  }

  hook(configuration: HookConfiguration): Hook {
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

  status(_: express.Request, res: express.Response) {
    const applications: { [key: string]: any } = {};

    this.applications.forEach((val, key) => {
      applications[key] = val.toJSON()
    });

    res.json(applications);
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

