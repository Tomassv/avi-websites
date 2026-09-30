import { getRequestListener } from "@hono/node-server";
import { createApp } from "./app.ts";
import { productionDeps } from "./deps.ts";

/** The Vercel function entry (bundled by scripts/build.mjs into .vercel/output). */
const app = createApp(productionDeps());
export default getRequestListener(app.fetch);
