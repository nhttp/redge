import type { NHttp, RequestEvent } from "nhttp";
import { config, esbuild } from "./esbuild.ts";
import entryPoint from "./entry_point.ts";

// deno-lint-ignore no-explicit-any
type TAny = any;

function setHeader(rev: RequestEvent) {
  rev.response.type("js");
  rev.response.setHeader(
    "cache-control",
    "public, max-age=31536000, immutable",
  );
}
const map = new Map();
function serveClient(app: NHttp, path: string, main: string) {
  if (!map.has(path)) {
    app.get(path, async (rev) => {
      if (!map.has(path)) {
        const res = await esbuild.build({
          ...config,
          entryPoints: entryPoint(main),
          write: false,
        });
        const arr = res.outputFiles.filter((el) => el.path.includes("/chunk-"));
        arr.forEach(({ path, contents }) => {
          app.get(path.slice(path.lastIndexOf("/")), (rev) => {
            setHeader(rev);
            return contents;
          });
        });
        map.set(path, res.outputFiles[0].contents);
      }
      setHeader(rev);
      return map.get(path);
    });
  }
}
function toArrNode(elem: JSX.Element) {
  let arr = [] as TAny;
  let childs = elem.props?.children ?? [];
  if (!childs.pop) childs = [childs];
  for (let i = 0; i < childs.length; i++) {
    const child = childs[i];
    if (child?.props?.children) {
      arr = arr.concat(toArrNode(child));
    } else if (child.type?.meta_url) {
      arr.push(child);
    }
  }
  return arr;
}
function isEmptyObj(props: TAny) {
  for (const _ in props) return false;
  return true;
}
function bundle(app: NHttp, elem: JSX.Element) {
  const fn = elem.type as TAny;
  const main = fn.meta_url;
  let arr = [] as TAny;
  if (main) {
    serveClient(app, fn.path, main);
    const props = elem.props;
    if (props.children) delete props.children;
    if (!isEmptyObj(props)) {
      arr.push(
        `<script id="p-${fn.hash}" type="application/json">${
          JSON.stringify(props)
        }</script>`,
      );
    }
    arr.push(`<script type="module" src="${fn.path}" async></script>`);
  } else {
    toArrNode(elem).forEach((elem: JSX.Element) => {
      arr = arr.concat(bundle(app, elem));
    });
  }
  return arr;
}
export default bundle;
