import { createElement, type FC } from "react";
import { hydrateRoot } from "react-dom/client";

declare global {
  // deno-lint-ignore no-var
  var __client: {
    [k: string]: { path: string; meta_url: string; props?: TAny };
  };
}
// deno-lint-ignore no-explicit-any
type TAny = any;
export const IS_CLIENT = typeof document !== "undefined";
const tt = Date.now();
type FunctionComp<T> = FC<T>;
let count = 0;

export function hydrate<T>(
  fn: FunctionComp<T>,
  meta_url: string,
): FunctionComp<T> {
  if (IS_CLIENT) {
    if (!meta_url) return fn;
    if (meta_url.includes("/chunk-")) return fn;
    const path = meta_url.slice(meta_url.indexOf("/", 8) + 1);
    const id = path.slice(0, path.indexOf("."));
    const target = document.getElementById(id) as Element;
    const props = document.getElementById(`p-${id}`);
    const elem = createElement(
      fn as FC,
      props ? JSON.parse(props.textContent || "{}") : {},
    );
    return hydrateRoot(target, elem, {
      onRecoverableError() {/* noop */},
    }) as TAny;
  }
  const hash = `${(btoa(meta_url.slice(-16, -4))).toLowerCase()}${count++}`;
  const path = `/${hash}.${tt}`;
  globalThis.__client ??= {};
  globalThis.__client[hash] = { path, meta_url };
  return (props: TAny) => {
    if (globalThis.__client[hash]) {
      globalThis.__client[hash].props = props;
    }
    return createElement("div", { id: hash }, [
      createElement(fn as FC, props),
    ]);
  };
}

export default hydrate;
