import { useEffect, useState } from "react";
import { hydrate, IS_CLIENT } from "redge/client";

interface TCounter {
  init: number;
}

const meta_url = import.meta.url;

const Counter = ({ init }: TCounter) => {
  const [count, setCount] = useState(init);

  useEffect(() => {
    console.log(count);
  }, [count]);

  return (
    <div>
      <h1>Counter</h1>
      <p>
        This counter hydrate from script{" "}
        {IS_CLIENT && <a href={meta_url}>{meta_url}</a>}
      </p>
      <button onClick={() => setCount((p) => p - 1)}>
        - Decrement
      </button>
      <span style={{ margin: 20, fontSize: 20 }}>{count}</span>
      <button onClick={() => setCount((p) => p + 1)}>
        Increment +
      </button>
    </div>
  );
};

export default hydrate(Counter, meta_url);
