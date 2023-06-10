import "../main.ts";
import { STORE } from "redge/client";
import { Esbuild, isEmptyObj } from "redge";

try {
  await Deno.remove("build", { recursive: true });
} catch { /* noop */ }

if (!isEmptyObj(STORE)) {
  const es = new Esbuild();
  Object.assign(es.config.entryPoints as Record<string, string>, STORE);
  try {
    es.config.outdir = "build";
    await es.esbuild.build(es.config);
    es.esbuild.stop();
    const sample = Object.keys(STORE)[0];
    Deno.writeTextFileSync(
      "build/build_id.txt",
      sample.substring(sample.lastIndexOf(".") + 1),
    );
    console.log("Success build...");
  } catch (error) {
    console.log(error);
  }
} else {
  console.log("Success build. with no hydration components");
}

Deno.exit(1);
