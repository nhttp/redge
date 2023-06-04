import redge from "redge";
import home from "./pages/home.tsx";

const app = redge();

// register pages here.
app.use([home]);

app.listen(8080, (err, info) => {
  if (err) throw err;
  console.log(`> Running on port ${info.port}`);
});
