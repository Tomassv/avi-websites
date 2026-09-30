import { McpServer, type CallToolResult, type ToolAnnotations } from "@modelcontextprotocol/server";
import * as z from "zod";
import type { User } from "../auth/tokens.ts";
import { ToolError } from "../guardrails/errors.ts";
import { MAX_TEXT } from "../guardrails/fields.ts";
import { redactArgs } from "../log.ts";
import { refused, type ToolContext } from "./context.ts";
import * as t from "./tools.ts";

/**
 * One McpServer per request (createMcpHandler's factory), built for the signed-in user. Every
 * tool call goes through `run`: rate limits, a log line, and ToolErrors turned into results
 * Claude can explain. Descriptions tell Claude the workflow; the server enforces it.
 */
export const INSTRUCTIONS = `Edit the AviLabs websites. Start with list_sites and get_site_guide.
Every edit goes into a change (a pull request); pass the returned change_id to later edits so they share one preview.
Then get_preview gives a preview link for the user, and publish (only after the user approves) makes it live.
Never publish without the user's explicit go-ahead.`;

const LIMITS = { calls: 60, writes: 20, links: 10 };
const WINDOW_SECONDS = 600;

const read: ToolAnnotations = { readOnlyHint: true, openWorldHint: false };
const write: ToolAnnotations = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };
const destructive: ToolAnnotations = { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false };

const site = z.string().max(100).describe('Site id from list_sites, e.g. "cura.aero"');
const changeId = z.number().int().positive().describe("The change to add to (from a previous tool result). Omit to start a new change.");
const summary = z.string().min(3).max(120).describe("One line describing the change, e.g. \"Shorter hero title on the home page\"");
const slug = z.string().max(60).describe('Lowercase words joined by hyphens, e.g. "spring-campaign"');

type Kind = "read" | "write" | "link";

export function buildServer(base: Omit<ToolContext, "user">, user: User): McpServer {
  const server = new McpServer({ name: "avi-websites", version: "0.1.0" }, { instructions: INSTRUCTIONS });
  const ctx: ToolContext = { ...base, user };

  async function limit(kind: Kind) {
    const w = Math.floor(Date.now() / (WINDOW_SECONDS * 1000));
    const over = async (key: string, max: number) => (await ctx.store.incr(`rl:${user.email}:${key}:${w}`, WINDOW_SECONDS)) > max;
    if (await over("calls", LIMITS.calls)) throw new ToolError("rate_limited", "Too many requests; wait a few minutes.");
    if (kind === "write" && (await over("writes", LIMITS.writes))) throw new ToolError("rate_limited", "Too many changes in a short time; wait a few minutes.");
    if (kind === "link" && (await over("links", LIMITS.links))) throw new ToolError("rate_limited", "Too many upload links; wait a few minutes.");
  }

  async function run(tool: string, kind: Kind, args: Record<string, unknown>, fn: () => Promise<CallToolResult>): Promise<CallToolResult> {
    const started = Date.now();
    const entry = { event: "tool", requestId: ctx.requestId, user: user.email, tool, site: args.site ?? null, changeId: args.change_id ?? null, args: redactArgs(args) };
    try {
      await limit(kind);
      const result = await fn();
      const s = result.structuredContent as Record<string, unknown> | undefined;
      ctx.log({ ...entry, changeId: s?.change_id ?? entry.changeId, files: s?.file ? [s.file] : s?.files, outcome: "ok", durationMs: Date.now() - started });
      return result;
    } catch (e) {
      if (e instanceof ToolError) {
        ctx.log({ ...entry, outcome: "refused", code: e.code, message: e.message, durationMs: Date.now() - started });
        return refused(e);
      }
      ctx.log({ ...entry, outcome: "error", error: String((e as Error)?.stack ?? e).slice(0, 2000), durationMs: Date.now() - started });
      return {
        isError: true,
        content: [{ type: "text", text: `Something went wrong on the server; nothing was changed by this call. Reference: ${ctx.requestId}.` }],
      };
    }
  }

  function tool<S extends z.ZodObject>(name: string, kind: Kind, annotations: ToolAnnotations, title: string, description: string, inputSchema: S, fn: (a: z.infer<S>) => Promise<CallToolResult>) {
    // The SDK validates `args` against inputSchema before calling back; its overloads can't
    // infer that through this generic wrapper, hence the cast.
    const callback = async (args: unknown) => run(name, kind, args as Record<string, unknown>, () => fn(args as z.infer<S>));
    server.registerTool(name, { title, description, inputSchema, annotations }, callback as never);
  }

  tool("list_sites", "read", read, "List sites", "The websites this connector can edit, and who is signed in. Call this first.", z.object({}), () => t.listSites(ctx));

  tool(
    "get_site_guide",
    "read",
    read,
    "Site guide",
    "How to edit a site: what can be changed, the text markup rules, the landing page section catalog with every field, the article format, image rules, and the change → preview → publish workflow. Read it before making changes.",
    z.object({ site }),
    (a) => t.getSiteGuide(ctx, a),
  );

  tool(
    "list_pages",
    "read",
    read,
    "List pages",
    "Every editable content file of a site: pages, landing pages, articles and shared text, with their URLs. Pass change_id to see a change's version.",
    z.object({ site, change_id: changeId.optional().describe("Read the version in this change instead of the live site") }),
    (a) => t.listPages(ctx, a),
  );

  tool(
    "get_page_content",
    "read",
    read,
    "Read a page",
    "The content of one file from list_pages. For JSON pages it lists every editable text value with its JSON pointer and type (rich, text, href, image, icon); use those pointers with update_text. For articles it returns the frontmatter, body and bodySha256.",
    z.object({ site, file: z.string().max(300).describe('File path from list_pages, e.g. "content/pages/home.json"'), change_id: changeId.optional().describe("Read the version in this change") }),
    (a) => t.getPageContent(ctx, a),
  );

  tool(
    "update_text",
    "write",
    write,
    "Update text",
    "Replace existing text values in a JSON content file, by JSON pointer from get_page_content. Only existing strings can change; nothing can be added, removed or restructured. oldValue must be the current value. Rich text may only use the markup in get_site_guide. Creates a change (or adds to change_id).",
    z.object({
      site,
      file: z.string().max(300),
      edits: z
        .array(z.object({ pointer: z.string().min(1).max(500), oldValue: z.string().max(20_000), newValue: z.string().max(MAX_TEXT) }))
        .min(1)
        .max(50),
      summary,
      change_id: changeId.optional(),
    }),
    (a) => t.updateText(ctx, a),
  );

  const articleFields = {
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(400),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("YYYY-MM-DD"),
    author: z.string().max(100).optional(),
    image: z.string().max(200).optional().describe("An uploaded image path, e.g. /images/news/photo.webp"),
    draft: z.boolean().optional().describe("true keeps it off the live site after publishing. Default false."),
  };

  tool(
    "create_article",
    "write",
    write,
    "Create article",
    "Write a new article (Markdown body; raw HTML is ignored by the site). It is published with the change unless draft is true. Creates a change (or adds to change_id).",
    z.object({ site, slug, ...articleFields, body: z.string().min(1).max(90_000).describe("Markdown"), change_id: changeId.optional() }),
    (a) => t.createArticle(ctx, a),
  );

  tool(
    "update_article",
    "write",
    write,
    "Update article",
    "Change an existing article's frontmatter fields and/or replace its body. To replace the body, pass oldBodySha256 from get_page_content.",
    z.object({
      site,
      slug,
      title: articleFields.title.optional(),
      description: articleFields.description.optional(),
      date: articleFields.date.optional(),
      author: articleFields.author,
      image: articleFields.image,
      draft: articleFields.draft,
      body: z.string().min(1).max(90_000).optional(),
      oldBodySha256: z.string().regex(/^[0-9a-f]{64}$/).optional(),
      summary,
      change_id: changeId.optional(),
    }),
    (a) => t.updateArticle(ctx, a),
  );

  tool(
    "create_landing_page",
    "write",
    write,
    "Create landing page",
    "Create a landing page from the section catalog in get_site_guide. `page` is the whole landing JSON (seo, header, sections; draft defaults to false). It is checked with the site's own schema and rules; images must be uploaded to folder landing/<slug> first. Creates a change (or adds to change_id).",
    z.object({ site, slug, page: z.record(z.string(), z.unknown()).describe("The landing page JSON"), change_id: changeId.optional() }),
    (a) => t.createLandingPage(ctx, a),
  );

  tool(
    "upload_image",
    "write",
    write,
    "Upload image",
    "Upload a small image as base64 (up to 3 MB; JPEG, PNG, WebP or AVIF). It is resized, stripped of metadata and stored as WebP. For photos on the user's computer use get_image_upload_link instead.",
    z.object({
      site,
      folder: z.string().max(80).describe('"landing/<slug>" for a landing page, or "news"'),
      name: z.string().min(1).max(100).describe('File name without extension, e.g. "hero"'),
      dataBase64: z.string().min(1).max(4_200_000),
      change_id: changeId.optional(),
    }),
    (a) => t.uploadImage(ctx, a),
  );

  tool(
    "get_image_upload_link",
    "link",
    write,
    "Get an image upload link",
    "A one-time link (15 minutes) where the signed-in user uploads a photo from their computer. The image path is returned now; call check_upload after the user uploads.",
    z.object({ site, folder: z.string().max(80).describe('"landing/<slug>" or "news"'), name: z.string().min(1).max(100), change_id: changeId.optional() }),
    (a) => t.getImageUploadLink(ctx, a),
  );

  tool(
    "check_upload",
    "read",
    read,
    "Check an upload",
    "Whether the image for an upload link has arrived, and in which change.",
    z.object({ upload_id: z.string().max(64) }),
    (a) => t.checkUpload(ctx, a),
  );

  tool(
    "get_preview",
    "read",
    read,
    "Preview a change",
    "The preview link and build status of a change, whether it can be published, and which pages in it are drafts. Call it again while the preview is building.",
    z.object({ change_id: z.number().int().positive(), path: z.string().max(200).optional().describe("Page path to open, e.g. /spring-campaign") }),
    (a) => t.getPreview(ctx, a),
  );

  tool(
    "publish",
    "write",
    destructive,
    "Publish a change",
    "Make a change live. Only call this after the user has seen the preview and said to publish. It merges only if the preview build succeeded and all checks pass; pages with draft: true stay hidden.",
    z.object({ change_id: z.number().int().positive(), confirm: z.literal(true).describe("Must be true: the user asked to publish") }),
    (a) => t.publish(ctx, a),
  );

  tool(
    "undo",
    "write",
    destructive,
    "Undo a published change",
    "Start a new change that restores everything a published change touched. It goes live only after get_preview and publish.",
    z.object({ change_id: z.number().int().positive() }),
    (a) => t.undo(ctx, a),
  );

  tool(
    "discard_change",
    "write",
    destructive,
    "Discard a change",
    "Close an unpublished change and delete its branch. Nothing is published.",
    z.object({ change_id: z.number().int().positive(), confirm: z.literal(true) }),
    (a) => t.discardChange(ctx, a),
  );

  tool(
    "list_changes",
    "read",
    read,
    "List changes",
    "Open, published or all changes made through this connector, newest first.",
    z.object({ site: site.optional(), state: z.enum(["open", "published", "all"]).optional(), mine: z.boolean().optional(), limit: z.number().int().min(1).max(30).optional() }),
    (a) => t.listChanges(ctx, a),
  );

  return server;
}
