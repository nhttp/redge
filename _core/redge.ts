import * as esbuildOri from "https://deno.land/x/esbuild@v0.17.19/mod.js";
import * as esbuildWasm from "https://deno.land/x/esbuild@v0.17.19/wasm.js";
import { denoPlugins } from "https://deno.land/x/esbuild_deno_loader@0.7.0/mod.ts";
import Helmet from "redge/helmet";
import { options, renderToHtml } from "nhttp/render";
import { renderToString } from "react-dom/server";
import { NHttp, RequestEvent, Router, TApp } from "nhttp";
import { tt } from "redge/client";

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
const isDeploy = !args.includes("--no-wasm");
const isDev = args.includes("--dev");
class Esbuild {
  config: esbuildOri.BuildOptions = {
    absWorkingDir: Deno.cwd(),
    format: "esm",
    bundle: true,
    platform: "neutral",
    treeShaking: true,
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

function isEmptyObj(props: TAny) {
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
const delay = (t: number) => new Promise((ok) => setTimeout(ok, t));
export class Redge extends NHttp {
  #entry: Record<string, TAny> = {};
  #cache: Record<string, Uint8Array | boolean> = {};
  #es = new Esbuild();
  #awaiter = async (path: string) => {
    let i = 0;
    while (this.#cache[path] === void 0) {
      await delay(1000);
      if (this.#cache[path] !== void 0 || i === 10) break;
      i++;
    }
    return this.#cache[path] ?? new Response(null, { status: 204 });
  };
  constructor(opts: TApp = {}) {
    super(opts);
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
        return `let bool = false; new EventSource("/__REFRESH__").addEventListener("message", _ => {if (bool) location.reload();else bool = true;});`;
      });
    }
    options.onRenderElement = (elem) => {
      Helmet.render = renderToString;
      const body = Helmet.render(elem);
      const src = this.#getSource(elem);
      if (src.length) {
        if (isDev) src.unshift(`<script src="/dev.${tt}.js"></script>`);
        const last = Helmet.writeBody?.() ?? [];
        Helmet.writeBody = () => [
          ...src,
          ...last,
        ];
        if (!isEmptyObj(this.#entry)) {
          return (async () => {
            const isReady = this.#cache["__IS_READY__"] ??
              await this.#awaiter("__IS_READY__");
            if (isReady === true) {
              this.#createAssets();
            }
            return body;
          })();
        }
      }
      return body;
    };
    this.engine(renderToHtml);
    const ori = this.listen.bind(this);
    this.listen = async (...args) => {
      await Esbuild.initWasm();
      this.#cache["__IS_READY__"] = true;
      return await ori(...args);
    };
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
  #getSource = (elem: JSX.Element) => {
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
      const path = `${fn.path}.js`;
      src.push(`<script type="module" src="${path}" async></script>`);
      if (this.#cache[path] === void 0) {
        const key = fn.path.substring(1);
        this.#entry[key] = fn.meta_url;
      }
    } else {
      const arr: JSX.Element[] = this.#findNode(elem);
      arr.forEach((elem) => {
        src = src.concat(this.#getSource(elem));
      });
    }
    return src;
  };
  #bundle = () => {
    const entryPoints = {
      ...this.#entry,
      client: "redge/client",
      react: "react",
    };
    this.#es.esbuild.build({
      ...this.#es.config,
      entryPoints,
      write: false,
    }).then((res) => {
      const files = res.outputFiles;
      files.forEach(({ path, contents }) => {
        path = toPathname(path);
        if (this.#cache[path] === void 0) {
          if (path.includes("/chunk-")) {
            this.get(path, (rev) => {
              setHeader(rev);
              return contents;
            });
          } else {
            this.#cache[path] = contents;
          }
        }
      });
      if (!isDeploy) this.#es.esbuild.stop();
      this.#entry = {};
    }).catch(console.error);
  };
  #createAssets = () => {
    for (const k in this.#entry) {
      const path = "/" + k + ".js";
      this.get(path, async (rev) => {
        setHeader(rev);
        return this.#cache[path] ?? await this.#awaiter(path);
      });
    }
    this.#bundle();
  };
}

export const redge = (opts: TApp = {}) => new Redge(opts);
export default redge;
