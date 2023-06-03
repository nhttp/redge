import bundle from "./bundle.ts";
import { options } from "nhttp/jsx/render.ts";
import { Helmet } from "nhttp/jsx/helmet.ts";
import { renderToString } from "react-dom/server";
import type { NHttp } from "nhttp";

export default function useReactJit(app: NHttp) {
  options.onRenderElement = (elem) => {
    const arr = bundle(app, elem);
    Helmet.render = renderToString;
    const body = Helmet.render(elem);
    const last = Helmet.writeBody?.() ?? [];
    Helmet.writeBody = () => [
      ...arr,
      ...last,
    ];
    return body;
  };
}
