import { createElement, type FC } from "react";
import { hydrateRoot } from "react-dom/client";
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
    }) as unknown as FunctionComp<T>;
  }
  count++;
  const hash = `comp-${count}`;
  const path = `/${hash}.${tt}.js`;
  const elem = (props: TAny) => {
    return createElement("div", { id: hash }, [
      createElement(fn as FC, props),
    ]);
  };
  elem.meta_url = meta_url;
  elem.path = path;
  elem.hash = hash;
  return elem;
}

export default hydrate;
