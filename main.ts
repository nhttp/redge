import redge from "redge";
import home from "./pages/home.tsx";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const app = redge();

// register pages here.
app.use([home]);

serve(app.handle, { port: 8080 });
