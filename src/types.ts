import {Page} from "./page";
import {RenderResult} from "./engine";
import express from "express";

interface Plugin {
  onBeforeStart?: () => Promise<void>;

  onBeforeRender?: (page: Page, request: express.Request) => Promise<void | RenderResult>;

  onAfterRender?: (page: Page, request: express.Request, renderResult: RenderResult, res: express.Response) => Promise<void>;
}

type PluginEvents = 'onAfterRender' | 'onBeforeRender';

export {
  PluginEvents,
  Plugin
}
