import type { CallToolResult } from "@modelcontextprotocol/server";
import type { User } from "../auth/tokens.ts";
import type { Config } from "../config.ts";
import type { ChangeService } from "../github/changes.ts";
import { ToolError } from "../guardrails/errors.ts";
import type { Logger } from "../log.ts";
import { getSite } from "../sites/index.ts";
import type { SiteConfig } from "../sites/types.ts";
import type { Store } from "../store/store.ts";

/** Everything a tool call can use. One per request; `user` comes from the verified token. */
export type ToolContext = {
  cfg: Config;
  user: User;
  changes: ChangeService;
  store: Store;
  log: Logger;
  requestId: string;
};

/** A successful result: structured data plus text that ends with what Claude should do next. */
export function done(structured: Record<string, unknown>, text: string, next: string): CallToolResult {
  return { content: [{ type: "text", text: `${text}\n\nNext: ${next}` }], structuredContent: structured };
}

/** A refusal Claude can explain to the user. */
export function refused(e: ToolError): CallToolResult {
  return {
    isError: true,
    content: [{ type: "text", text: `${e.message}\n\n(code: ${e.code})` }],
    structuredContent: { code: e.code, message: e.message, ...(e.details ? { details: e.details } : {}) },
  };
}

export function siteOrThrow(id: string): SiteConfig {
  const site = getSite(id);
  if (!site) throw new ToolError("unknown_site", `There's no site "${id}". Call list_sites to see the sites.`);
  return site;
}

export async function siteOfChange(ctx: ToolContext, changeId: number): Promise<SiteConfig> {
  const id = await ctx.changes.siteIdOf(changeId);
  if (!id) throw new ToolError("change_not_found", `change ${changeId} doesn't exist`);
  return siteOrThrow(id);
}

/** The public URL path of a site file, if it is a page. */
export function urlOf(site: SiteConfig, path: string): string | null {
  if (Object.hasOwn(site.pageRoutes, path)) return site.pageRoutes[path];
  const name = path.slice(path.lastIndexOf("/") + 1);
  const { pages, landing, articles } = site.capabilities;
  if (pages && path.startsWith(`${pages.dir}/`) && name.endsWith(".json")) return `/${name.slice(0, -5)}`;
  if (landing && path.startsWith(`${landing.dir}/`) && name.endsWith(".json")) return `${landing.urlPrefix}${name.slice(0, -5)}`;
  if (articles && path.startsWith(`${articles.dir}/`) && name.endsWith(".md")) return `${articles.urlPrefix}${name.slice(0, -3)}`;
  if (path.startsWith("public/")) return path.slice("public".length);
  return null;
}
