import { createElement, type FC } from "react";
import { createRoot } from "react-dom/client";

// deno-lint-ignore no-explicit-any
type TAny = any;
export const IS_CLIENT = typeof document !== "undefined";
type FunctionComp<T> = FC<T>;
export const STORE: Record<string, string> = {};
export const tt = Date.now();
export function hydrate<T>(
  fn: FunctionComp<T>,
  meta_url: string,
): FunctionComp<T> {
  if (IS_CLIENT) {
    if (!meta_url) return fn;
    if (meta_url.includes("/chunk-")) return fn;
    const path = meta_url.slice(meta_url.indexOf("/", 8) + 5);
    const id = path.slice(0, path.indexOf("."));
    const target = document.getElementById(id) as Element;
    const props = document.getElementById(`p-${id}`);
    return createRoot(target).render(createElement(
      fn as FC,
      props ? JSON.parse(props.textContent || "{}") : {},
    )) as TAny;
  }
  const hash = `${(btoa(meta_url.slice(-16, -4))).toLowerCase()}`;
  const mod = (props: TAny) => {
    return createElement("div", { id: hash }, [
      createElement(fn as FC, props),
    ]);
  };
  mod.meta_url = meta_url;
  mod.hash = hash;
  STORE[`${hash}.${tt}`] = meta_url;
  return mod;
}

export default hydrate;
