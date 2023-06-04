import * as esbuildOri from "https://deno.land/x/esbuild@v0.17.19/mod.js";
import * as esbuildWasm from "https://deno.land/x/esbuild@v0.17.19/wasm.js";
import { denoPlugins } from "https://deno.land/x/esbuild_deno_loader@0.7.0/mod.ts";
import Helmet from "redge/helmet";
import { options, renderToHtml } from "nhttp/render";
import { renderToString } from "react-dom/server";
import { NHttp, RequestEvent, Router, TApp } from "nhttp";

export { Router };

const shim = new Router();
export const GET = shim.get.bind(shim);
export const POST = shim.post.bind(shim);
export const PUT = shim.put.bind(shim);
export const PATCH = shim.patch.bind(shim);
export const DELETE = shim.delete.bind(shim);
export const ANY = shim.any.bind(shim);

// deno-lint-ignore no-explicit-any
type TAny = any;

const REDGE_HYDRATE = "__REDGE_HYDRATE__";

class Esbuild {
  #isDeploy = !Deno.args.includes("--no-wasm");
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

  async getEsbuild() {
    if (this.#isDeploy) {
      const wasmModule = await WebAssembly.compileStreaming(
        fetch("https://unpkg.com/esbuild-wasm@0.17.19/esbuild.wasm"),
      );
      await esbuildWasm.initialize({ wasmModule, worker: false });
      return esbuildWasm;
    }
    return esbuildOri;
  }
}

const es = new Esbuild();
const config = es.config;
const esbuild = await es.getEsbuild();

function isEmptyObj(props: TAny) {
  if (!props) return false;
  for (const _ in props) return false;
  return true;
}

const toPathname = (path: string) => path.slice(path.lastIndexOf("/"));

export class Redge extends NHttp {
  #src: string[] = [];
  constructor(opts: TApp = {}) {
    super(opts);
    const setHeader = (rev: RequestEvent) => {
      rev.response.type("js");
      rev.response.setHeader(
        "cache-control",
        "public, max-age=31536000, immutable",
      );
    };
    options.onRenderElement = (elem) => {
      Helmet.render = renderToString;
      const body = Helmet.render(elem);
      const props = this.#genProps();
      const last = Helmet.writeBody?.() ?? [];
      Helmet.writeBody = () => [
        ...props,
        ...this.#src,
        ...last,
      ];
      return body;
    };
    this.engine(renderToHtml);
    const ori = this.listen.bind(this);
    this.listen = async (opts, cb) => {
      const client = globalThis.__client;
      const entry: Record<string, string> = {};
      for (const k in client) {
        const { path, meta_url } = client[k];
        entry[REDGE_HYDRATE + path.substring(1)] = meta_url;
        this.#src.push(
          `<script type="module" src="${path}.js" async></script>`,
        );
      }
      const files = await this.#bundle(entry);
      files.forEach(({ path, contents }) => {
        path = toPathname(path);
        if (path.includes(REDGE_HYDRATE)) {
          const route = path.substring(REDGE_HYDRATE.length + 1);
          this.get(`/${route}`, (rev) => {
            setHeader(rev);
            return contents;
          });
        } else {
          this.get(path, (rev) => {
            setHeader(rev);
            return contents;
          });
        }
      });
      return await ori(opts, cb);
    };
  }
  #genProps = () => {
    const props = globalThis.__props;
    const arr: string[] = [];
    for (const k in props) {
      if (!isEmptyObj(props[k])) {
        if (props[k].children) props[k].children = void 0;
        arr.push(
          `<script id="p-${k}" type="application/json">${
            JSON.stringify(props[k])
          }</script>`,
        );
      }
    }
    return arr;
  };
  #bundle = async (entry: Record<string, string>) => {
    const entryPoints = {
      ...entry,
      client: "redge/client",
      hydrate: "react-dom/client",
      runtime: "react/jsx-runtime",
      react: "react",
    };
    const res = await esbuild.build({
      ...config,
      entryPoints,
      write: false,
    });
    return res.outputFiles;
  };
}

export const redge = (opts: TApp = {}) => new Redge(opts);
export default redge;
