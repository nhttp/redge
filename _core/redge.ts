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

export class Api extends Router {
  constructor(base?: string) {
    super({ base: base ?? "/api" });
  }
}

// deno-lint-ignore no-explicit-any
type TAny = any;

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
const setHeader = (rev: RequestEvent) => {
  rev.response.type("js");
  rev.response.setHeader(
    "cache-control",
    "public, max-age=31536000, immutable",
  );
};
export class Redge extends NHttp {
  #cache: Record<string, TAny> = {};
  constructor(opts: TApp = {}) {
    super(opts);
    options.onRenderElement = (elem) => {
      Helmet.render = renderToString;
      const body = Helmet.render(elem);
      const { src, isBundle } = this.#getClient();
      const last = Helmet.writeBody?.() ?? [];
      Helmet.writeBody = () => [
        ...src,
        ...last,
      ];
      if (!isBundle) {
        return this.#bundle(this.#cache).then((files) => {
          files.forEach(({ path, contents }) => {
            this.get(toPathname(path), (rev) => {
              setHeader(rev);
              return contents;
            });
          });
          return body;
        });
      }
      return body;
    };
    this.engine(renderToHtml);
  }
  #getClient = () => {
    const client = globalThis.__client;
    const src: string[] = [];
    let isBundle = true;
    for (const k in client) {
      const { path, meta_url, props } = client[k];
      const key = path.substring(1);
      if (!this.#cache[key]) {
        this.#cache[key] = meta_url;
        isBundle = false;
      }
      if (!isEmptyObj(props)) {
        if (props.children) props.children = void 0;
        src.push(
          `<script id="p-${k}" type="application/json">${
            JSON.stringify(props)
          }</script>`,
        );
      }
      src.push(`<script type="module" src="${path}.js" async></script>`);
    }
    return { src, isBundle };
  };
  #bundle = async (entry: Record<string, string>) => {
    const entryPoints = {
      ...entry,
      client: "redge/client",
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
