import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { productionDeps } from "./deps.ts";

/** Local server: `npm run dev` (reads .env.local). */
const port = Number(process.env.PORT ?? 3000);
const deps = productionDeps();
serve({ fetch: createApp(deps).fetch, port }, () => {
  console.log(`avi-websites-mcp on http://localhost:${port} (MCP endpoint ${deps.cfg.resource})`);
});
