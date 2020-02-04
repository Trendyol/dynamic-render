import {Page} from "./page";
import {RenderResult} from "./engine";

interface Plugin {
  onBeforeStart?: () => Promise<void>;

  onBeforeRender?: (page: Page, url: string) => Promise<void> | Promise<RenderResult>;

  onAfterRender?: (page: Page, url: string, renderResult: RenderResult) => Promise<void>;
}

type PluginEvents = 'onAfterRender' | 'onBeforeRender';

export {
  PluginEvents,
  Plugin
}
