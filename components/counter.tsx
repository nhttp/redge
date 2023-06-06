import { type FC, useState } from "react";
import { hydrate, IS_CLIENT } from "redge/client";

const Counter: FC<{ init: number }> = ({ init }) => {
  const [count, setCount] = useState(init);

  return (
    <>
      <h1>Counter</h1>
      <button onClick={() => setCount((p) => p - 1)} disabled={!IS_CLIENT}>
        - Decrement
      </button>
      <span style={{ margin: 20, fontSize: 20 }}>{count}</span>
      <button onClick={() => setCount((p) => p + 1)} disabled={!IS_CLIENT}>
        Increment +
      </button>
    </>
  );
};

export default hydrate(Counter, import.meta.url);
