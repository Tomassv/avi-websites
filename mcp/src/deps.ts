import path from "node:path";
import { googleClient } from "./auth/google.ts";
import { loadConfig, type Config } from "./config.ts";
import { memoryRepo, readCheckout } from "./github/memory.ts";
import { octokitPort } from "./github/octokit.ts";
import { stdoutLogger } from "./log.ts";
import { memoryStore, upstashStore } from "./store/store.ts";
import type { AppDeps } from "./app.ts";

/** Real dependencies from the environment. DRY_RUN uses an in-memory copy of the checkout. */
export function productionDeps(env: Record<string, string | undefined> = process.env): AppDeps {
  const cfg: Config = loadConfig(env);
  const store = cfg.redis === "memory" ? memoryStore() : upstashStore(cfg.redis.url, cfg.redis.token);
  const gh = cfg.dryRun ? dryRunRepo(env) : octokitPort(cfg);
  return { cfg, store, log: stdoutLogger, fetch, google: googleClient(cfg), gh };
}

function dryRunRepo(env: Record<string, string | undefined>) {
  const root = path.resolve(import.meta.dirname, "../..");
  stdoutLogger({ event: "dry_run", message: `DRY_RUN: GitHub is an in-memory copy of ${root}; nothing is written to GitHub.` });
  return memoryRepo(readCheckout(root), { previewUrl: env.DRY_RUN_PREVIEW_URL ?? null });
}
