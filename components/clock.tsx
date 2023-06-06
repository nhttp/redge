import { useEffect, useState } from "react";
import { hydrate } from "redge/client";

const Clock = () => {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    const tt = setInterval(() => setDate(new Date()), 1000);
    return () => clearInterval(tt);
  }, []);

  return (
    <>
      <h1>Clock</h1>
      <h1>{date.toLocaleTimeString()}</h1>
    </>
  );
};

export default hydrate(Clock, import.meta.url);
