import { hydrate, IS_CLIENT } from "client";
import { useEffect, useState } from "react";

interface TCounter {
  init: number;
}
const self = IS_CLIENT ? import.meta.url : void 0;
const Counter = ({ init }: TCounter) => {
  const [count, setCount] = useState(init);

  useEffect(() => {
    console.log(count);
  }, [count]);

  return (
    <div>
      <h1>Counter</h1>
      <p>
        This counter hydrate from script {self && <a href={self}>{self}</a>}
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

export default hydrate(Counter, import.meta.url);
