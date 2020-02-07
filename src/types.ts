import {Page} from "./page";
import {RenderResult} from "./engine";
import express from "express";

interface Plugin {
  onBeforeStart?: () => Promise<void>;

  onBeforeRender?: (page: Page, url: string) => Promise<void | RenderResult>;

  onAfterRender?: (page: Page, url: string, renderResult: RenderResult, res: express.Response) => Promise<void>;
}

type PluginEvents = 'onAfterRender' | 'onBeforeRender';

export {
  PluginEvents,
  Plugin
}
