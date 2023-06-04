import redge from "redge";
import home from "./pages/home.tsx";

const app = redge();

app.use([home]);

app.listen(8080);
