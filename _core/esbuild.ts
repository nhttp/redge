import * as esbuildOri from "https://deno.land/x/esbuild@v0.17.19/mod.js";
import * as esbuildWasm from "https://deno.land/x/esbuild@v0.17.19/wasm.js";
import { denoPlugins } from "https://deno.land/x/esbuild_deno_loader@0.7.0/mod.ts";

const isDeploy = !Deno.args.includes("--no-wasm");
export const esbuild = <typeof esbuildOri> (isDeploy
  ? await (async () => {
    const wasmModule = await WebAssembly.compileStreaming(
      fetch("https://unpkg.com/esbuild-wasm@0.17.19/esbuild.wasm"),
    );
    await esbuildWasm.initialize({ wasmModule, worker: false });
    return esbuildWasm;
  })()
  : esbuildOri);

export const config: esbuildOri.BuildOptions = {
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
