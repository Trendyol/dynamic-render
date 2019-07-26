import {Server} from "./server";
import {Renderer} from "./renderer";
import {DynamicRender} from "./dynamic-render";

const server = new Server();
const renderer = new Renderer();


export = new DynamicRender(server, renderer);
