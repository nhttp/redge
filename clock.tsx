import { useEffect, useState } from "react";
import { hydrate, IS_CLIENT } from "client";

const self = IS_CLIENT ? import.meta.url : void 0;
const Clock = () => {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    const tt = setInterval(() => setDate(new Date()), 1000);
    return () => clearInterval(tt);
  }, []);

  return (
    <>
      <h1>Clock</h1>
      <p>This clock hydrate from script {self && <a href={self}>{self}</a>}</p>
      <h1>
        {date.toLocaleTimeString()}
      </h1>
    </>
  );
};

export default hydrate(Clock, import.meta.url);
