import {Server} from "./server";
import {Engine} from "./engine";
import {DynamicRender} from "./dynamic-render";


const server = new Server();
const engine = new Engine();


export = new DynamicRender(server, engine);
