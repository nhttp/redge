import Helmet from "redge/helmet";
import { GET } from "redge";
import Counter from "../components/counter.tsx";
import Clock from "../components/clock.tsx";

export default GET("/", (rev) => {
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
        <h1>Redge</h1>
        <p>A minimal React JIT-rendering on the Edge.</p>
        <p>Hydrate your Components only when you need.</p>
        <p>(This title run on server-side only).</p>
        <hr />
        <Counter init={10} />
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
