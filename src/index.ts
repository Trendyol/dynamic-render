import {Server} from "./server";
import {Engine} from "./engine";
import {DynamicRender} from "./dynamic-render";
import {ResponseCache} from "./response-cache";

const responseCache = new ResponseCache();
const server = new Server();
const engine = new Engine(responseCache);


export = new DynamicRender(server, engine);
