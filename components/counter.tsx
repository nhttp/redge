import { useEffect, useState } from "react";
import { hydrate, IS_CLIENT } from "redge/client";

interface TCounter {
  init: number;
}

const meta_url = import.meta.url;

const Counter = ({ init }: TCounter) => {
  const [count, setCount] = useState(init);
  const [disable, setDisable] = useState(true);

  useEffect(() => {
    console.log(count);
  }, [count]);

  useEffect(() => {
    setDisable(false);
  }, []);

  return (
    <div>
      <h1>Counter</h1>
      {IS_CLIENT
        ? (
          <p>
            This counter hydrate from script <a href={meta_url}>{meta_url}</a>
          </p>
        )
        : <p>Loading assets...</p>}
      <button onClick={() => setCount((p) => p - 1)} disabled={disable}>
        - Decrement
      </button>
      <span style={{ margin: 20, fontSize: 20 }}>{count}</span>
      <button onClick={() => setCount((p) => p + 1)} disabled={disable}>
        Increment +
      </button>
    </div>
  );
};

export default hydrate(Counter, meta_url);
