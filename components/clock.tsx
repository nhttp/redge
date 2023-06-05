import { useEffect, useState } from "react";
import { hydrate, IS_CLIENT } from "redge/client";

const meta_url = import.meta.url;

const Clock = () => {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    const tt = setInterval(() => setDate(new Date()), 1000);
    return () => clearInterval(tt);
  }, []);

  return (
    <>
      <h1>Clock</h1>
      {IS_CLIENT
        ? (
          <p>
            This clock hydrate from script <a href={meta_url}>{meta_url}</a>
          </p>
        )
        : <p>Loading assets...</p>}
      <h1>
        {date.toLocaleTimeString()}
      </h1>
    </>
  );
};

export default hydrate(Clock, meta_url);
