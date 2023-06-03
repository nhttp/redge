import nhttp from "nhttp";
import { renderToHtml } from "nhttp/jsx/render.ts";
import Helmet from "nhttp/jsx/helmet.ts";
import useReactJit from "./_core/hook.ts";
import Counter from "./counter.tsx";
import Clock from "./clock.tsx";

const app = nhttp();

useReactJit(app);

app.engine(renderToHtml);

app.get("/", () => {
  return (
    <>
      <Helmet>
        <title>Wellcome Home</title>
        <meta
          name="description"
          content="This example page for React JIT-render"
        />
      </Helmet>
      <div style={{ textAlign: "center" }}>
        <h1>Wellcome Home</h1>
        <h3>
          This simple example React JIT-render with partials-hydration based.
        </h3>
        <h3>Hydrate your Components only when you need.</h3>
        <h3>(This title and desc run on server-side only).</h3>
        <hr />
        <Counter init={5} />
        <hr />
        <h1>Wellcome Content</h1>
        <h2>content run on server-side only</h2>
        <hr />
        <Clock />
        <hr />
        <h1>Wellcome Footer</h1>
        <h2>footer run on server-side only</h2>
      </div>
    </>
  );
});

app.listen(8080);
