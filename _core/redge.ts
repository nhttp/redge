import * as esbuildOri from "https://deno.land/x/esbuild@v0.17.19/mod.js";
import * as esbuildWasm from "https://deno.land/x/esbuild@v0.17.19/wasm.js";
import { denoPlugins } from "https://deno.land/x/esbuild_deno_loader@0.7.0/mod.ts";
import Helmet from "redge/helmet";
import { options, renderToHtml } from "nhttp/render";
import serveStatic from "nhttp/serve-static";
import { renderToString } from "react-dom/server";
import { NHttp, RequestEvent, Router, TApp } from "nhttp";
import { tt as timestamps } from "redge/client";

let tt = timestamps;

export { Router };

const shim = new Router();
export const GET = shim.get.bind(shim);
export const POST = shim.post.bind(shim);
export const PUT = shim.put.bind(shim);
export const PATCH = shim.patch.bind(shim);
export const DELETE = shim.delete.bind(shim);
export const ANY = shim.any.bind(shim);

export class Api extends Router {
  constructor(base?: string) {
    super({ base: base ?? "/api" });
  }
}

// deno-lint-ignore no-explicit-any
type TAny = any;

const args = Deno.args ?? [];

const isDev = args.includes("--dev");
let isBuild = false;
if (isDev === false) {
  try {
    isBuild = Deno.statSync("build").isDirectory;
    tt = parseInt(Deno.readTextFileSync("build/build_id.txt"));
  } catch { /* noop */ }
}
const isDeploy = isBuild === false && args.includes("--no-wasm") === false;
export class Esbuild {
  config: esbuildOri.BuildOptions = {
    absWorkingDir: Deno.cwd(),
    format: "esm",
    bundle: true,
    platform: "neutral",
    treeShaking: true,
    entryPoints: { client: "redge/client", react: "react" },
    target: [
      "es2020",
      "chrome64",
      "edge79",
      "firefox62",
      "safari11.1",
    ],
    minify: true,
    splitting: true,
    outdir: ".",
    plugins: denoPlugins({
      importMapURL: new URL("./import_map.json", import.meta.url).href,
    }),
    jsx: "automatic",
    jsxImportSource: "react",
  };

  static async initWasm() {
    if (isDeploy) {
      const wasmModule = await WebAssembly.compileStreaming(
        fetch("https://unpkg.com/esbuild-wasm@0.17.19/esbuild.wasm"),
      );
      await esbuildWasm.initialize({ wasmModule, worker: false });
    }
  }

  get esbuild() {
    return isDeploy ? esbuildWasm : esbuildOri;
  }
}
await Esbuild.initWasm();
export function isEmptyObj(props: TAny) {
  if (!props) return false;
  for (const _ in props) return false;
  return true;
}

const toPathname = (path: string) => path.slice(path.lastIndexOf("/"));
const setHeader = (rev: RequestEvent) => {
  rev.response.type("js");
  rev.response.setHeader(
    "cache-control",
    "public, max-age=31536000, immutable",
  );
};
export class Redge extends NHttp {
  #cache: Record<string, {
    entry: Record<string, string>;
    src: string[];
    route: Record<string, boolean>;
    stat?: number;
  }> = {};
  #es = new Esbuild();
  constructor(opts: TApp = {}) {
    super(opts);
    this.use("/assets", serveStatic("public"));
    if (isBuild) {
      this.use(
        "/app",
        serveStatic("build", {
          etag: false,
          setHeaders(rev) {
            rev.response.setHeader(
              "cache-control",
              "public, max-age=31536000, immutable",
            );
          },
        }),
      );
    }
    if (isDev) {
      this.get("/__REFRESH__", ({ response }) => {
        response.type("text/event-stream");
        return new ReadableStream({
          start(controller) {
            controller.enqueue(`data: reload\nretry: 100\n\n`);
          },
          cancel(err) {
            console.log(err || "Error ReadableStream");
          },
        }).pipeThrough(new TextEncoderStream());
      });
      this.get(`/dev.${tt}.js`, (rev) => {
        setHeader(rev);
        return `(() => {let bool = false; new EventSource("/__REFRESH__").addEventListener("message", _ => {if (bool) location.reload(); else bool = true;});})();`;
      });
    }
    options.onRenderElement = (elem, rev) => {
      const key = rev.method + rev.route.path.toString();
      Helmet.render = renderToString;
      const body = Helmet.render(elem);
      let src = this.#cache[key]?.src;
      if (src === void 0) {
        this.#cache[key] = {
          entry: {},
          src: [],
          route: {},
        };
        src = this.#cache[key].src = this.#getSource(
          elem,
          key,
        ) as string[];
      }
      if (src.length) {
        const last = Helmet.writeFooterTag?.() ?? [];
        if (isDev) src = [`<script src="/dev.${tt}.js"></script>`].concat(src);
        Helmet.writeFooterTag = () => [
          ...src as string[],
          ...last,
        ];
        if (this.#cache[key].stat === undefined && isBuild === false) {
          return this.#bundle(key).then(() => body);
        }
      }
      return body;
    };
    this.engine(renderToHtml);
  }
  #findNode = (elem: JSX.Element) => {
    let arr = [] as TAny;
    let childs = elem.props?.children ?? [];
    if (!childs.pop) childs = [childs];
    for (let i = 0; i < childs.length; i++) {
      const child = childs[i];
      if (child?.props?.children) {
        arr = arr.concat(this.#findNode(child));
      } else if (child.type?.meta_url) {
        arr.push(child);
      }
    }
    return arr;
  };
  #getSource = (elem: JSX.Element, key: string) => {
    const fn = elem.type as TAny;
    const main = fn?.meta_url;
    let src: TAny[] = [];
    if (main) {
      const props = elem.props;
      if (!isEmptyObj(props)) {
        if (props?.children) props.children = void 0;
        src.push(
          `<script id="p-${fn.hash}" type="application/json">${
            JSON.stringify(props)
          }</script>`,
        );
      }
      const name = `${fn.hash}.${tt}`;
      const path = `/${name}.js`;
      src.push(`<script type="module" src="/app${path}" async></script>`);
      if (this.#cache[key].route[path] === void 0) {
        this.#cache[key].entry[name] = fn.meta_url;
      }
    } else {
      const arr: JSX.Element[] = this.#findNode(elem);
      arr.forEach((elem) => {
        src = src.concat(this.#getSource(elem, key));
      });
    }
    return src;
  };
  #bundle = async (key: string) => {
    Object.assign(this.#es.config.entryPoints as TAny, this.#cache[key].entry);
    try {
      const res = await this.#es.esbuild.build({
        ...this.#es.config,
        write: false,
      });
      const files = res.outputFiles;
      files.forEach(({ path, contents }) => {
        path = toPathname(path);
        if (this.#cache[key].route[path] === void 0) {
          this.get("/app" + path, (rev) => {
            setHeader(rev);
            return contents;
          });
          this.#cache[key].route[path] = true;
        }
      });
      if (!isDeploy) this.#es.esbuild.stop();
      this.#cache[key].stat = 1;
    } catch (err) {
      console.error(err);
    }
  };
}

export const redge = (opts: TApp = {}) => new Redge(opts);
export default redge;
