// Blocks a user immediately (access and refresh tokens), for 30 days or until undone:
//   npm run revoke -- someone@avilabs.is
//   npm run revoke -- someone@avilabs.is --undo
// Also remove them from ALLOWED_EMAILS (or the Workspace) to make it permanent.
import { loadConfig } from "../src/config.ts";
import { memoryStore, upstashStore } from "../src/store/store.ts";

const email = (process.argv[2] ?? "").toLowerCase();
if (!email.includes("@")) throw new Error("usage: npm run revoke -- <email> [--undo]");
const cfg = loadConfig();
const store = cfg.redis === "memory" ? memoryStore() : upstashStore(cfg.redis.url, cfg.redis.token);
if (process.argv.includes("--undo")) {
  await store.del(`revoked:${email}`);
  console.log(`${email} is no longer blocked`);
} else {
  await store.set(`revoked:${email}`, 1, 30 * 86400);
  console.log(`${email} is blocked for 30 days`);
}
