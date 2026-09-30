// Prints a 15-minute access token for local testing with the MCP Inspector (DEV_MODE only):
//   npm run dev:token -- you@avilabs.is
import { loadConfig } from "../src/config.ts";
import { isListed } from "../src/auth/allowlist.ts";
import { signAccessToken } from "../src/auth/tokens.ts";

const email = (process.argv[2] ?? "").toLowerCase();
const cfg = loadConfig();
if (!cfg.devMode) throw new Error("dev:token only works with DEV_MODE=1");
if (!isListed(cfg, email)) throw new Error(`${email || "(no email)"} isn't allowed by ALLOWED_EMAIL_DOMAIN / ALLOWED_EMAILS`);
const { token } = await signAccessToken(cfg, { sub: `dev:${email}`, email, name: email.split("@")[0] }, "dev-token", "websites");
console.log(token);
