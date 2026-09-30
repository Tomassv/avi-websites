import { randomBytes } from "node:crypto";
import type { User } from "../auth/tokens.ts";
import type { Config } from "../config.ts";
import { findDrafts, type DraftPage } from "../guardrails/drafts.ts";
import { assertNoDrift, manifestDirs } from "../guardrails/drift.ts";
import { ToolError } from "../guardrails/errors.ts";
import { isWritable, siteRelative } from "../guardrails/paths.ts";
import { evaluatePublish, type CheckState, type GateResult } from "../guardrails/publish-gates.ts";
import { commitSignature, SIGNATURE_TRAILER, withTrailers } from "../guardrails/signature.ts";
import type { Logger } from "../log.ts";
import type { SiteConfig } from "../sites/types.ts";
import type { CheckInfo, GitHubPort, PullInfo } from "./port.ts";

/**
 * Changes: one branch + one PR per change (MCP-PLAN.md §5). Branches are always
 * `mcp/<site>/…`; nothing is ever written to main except by a squash merge in publish.
 */
export const BRANCH_PREFIX = "mcp/";
const MAIN = "main";

export type Change = { changeId: number; branch: string; prUrl: string; headSha: string; title: string };

/** A consistent read of a change's branch (or of main, for a new change). */
export type BranchState = {
  site: SiteConfig;
  change: PullInfo | null;
  branch: string | null;
  headSha: string;
  /** Site-relative paths of every file at the head. */
  paths: Set<string>;
  read(path: string): Promise<Buffer | null>;
};

export type FileWrite = { path: string; content: Buffer | null };

export type PreviewStatus = {
  state: "queued" | "building" | "ready" | "failed" | "missing";
  url: string | null;
  headSha: string;
  checks: { name: string; state: CheckState }[];
  approval: "required" | "approved" | "not_required";
  files: string[];
  drafts: DraftPage[];
};

export type ChangeService = ReturnType<typeof changeService>;

function slugify(text: string, max = 40): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, max)
      .replace(/-+$/, "") || "change"
  );
}

const siteLabel = (site: SiteConfig) => `site:${site.id}`;
const metaBlock = (site: SiteConfig, user: User) => `<!-- mcp:${JSON.stringify({ site: site.id, createdBy: user.email })} -->`;

export function readMeta(body: string): { site?: string; createdBy?: string } {
  const m = /<!-- mcp:(\{.*?\}) -->/.exec(body);
  if (!m) return {};
  try {
    return JSON.parse(m[1]);
  } catch {
    return {};
  }
}

export function changeService(deps: { cfg: Config; gh: GitHubPort; log: Logger }) {
  const { cfg, gh } = deps;

  async function checkDrift(site: SiteConfig) {
    const shas: Record<string, string> = {};
    for (const dir of manifestDirs(site)) Object.assign(shas, await gh.listDir(MAIN, dir));
    assertNoDrift(site, shas);
  }

  /** The PR behind a change_id, checked to be an open MCP change for this site. */
  async function openChange(site: SiteConfig, changeId: number): Promise<PullInfo> {
    const pr = await gh.getPull(changeId);
    if (!pr || !pr.labels.includes("mcp")) throw new ToolError("change_not_found", `change ${changeId} doesn't exist`);
    if (!pr.labels.includes(siteLabel(site))) throw new ToolError("change_other_site", `change ${changeId} belongs to another site`);
    if (pr.merged) throw new ToolError("change_published", `change ${changeId} is already published; make a new change`);
    if (pr.state !== "open") throw new ToolError("change_closed", `change ${changeId} was closed; make a new change`);
    if (!pr.headRef.startsWith(BRANCH_PREFIX)) throw new ToolError("change_not_found", `change ${changeId} isn't an MCP branch`);
    return pr;
  }

  async function stateAt(site: SiteConfig, headSha: string, change: PullInfo | null): Promise<BranchState> {
    const entries = await gh.listTree(headSha, site.root);
    const paths = new Set(entries.filter((e) => e.type === "blob").map((e) => e.path.slice(site.root.length + 1)));
    return {
      site,
      change,
      branch: change?.headRef ?? null,
      headSha,
      paths,
      read: (p) => gh.readFile(headSha, `${site.root}/${p}`),
    };
  }

  /** Reads a change's branch (change_id given) or main (a new change). */
  async function branchState(site: SiteConfig, changeId?: number): Promise<BranchState> {
    if (changeId !== undefined) {
      const pr = await openChange(site, changeId);
      return stateAt(site, pr.headSha, pr);
    }
    const main = await gh.getBranchSha(MAIN);
    if (!main) throw new Error("main branch not found");
    return stateAt(site, main, null);
  }

  async function mainState(site: SiteConfig): Promise<BranchState> {
    return branchState(site);
  }

  /**
   * Commits files to the change's branch, creating the branch and PR for a new change. The
   * commit's parent is the head the caller validated against; if the branch moved since, the
   * fast-forward update fails and nothing is written.
   */
  async function write(p: { state: BranchState; user: User; summary: string; tool: string; files: FileWrite[]; comment: string }): Promise<Change> {
    const { state, user } = p;
    const site = state.site;
    await checkDrift(site);
    for (const f of p.files) {
      if (!isWritable(site, f.path)) throw new ToolError("path_not_writable", `${f.path} can't be changed through this server`);
    }
    const summary = p.summary.replace(/\s+/g, " ").trim().slice(0, 120) || "Content change";
    const branch = state.branch ?? `${BRANCH_PREFIX}${site.id.replace(/\./g, "-")}/${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${slugify(summary, 30)}-${randomBytes(2).toString("hex")}`;
    if (!branch.startsWith(BRANCH_PREFIX) || branch === MAIN) throw new Error(`refusing to write to ${branch}`);

    const entries: { path: string; sha: string | null }[] = [];
    for (const f of p.files) entries.push({ path: `${site.root}/${f.path}`, sha: f.content === null ? null : await gh.createBlob(f.content) });
    const parent = await gh.getCommit(state.headSha);
    const tree = await gh.createTree(parent.tree, entries);
    const bot = await gh.botIdentity();
    const author = { name: user.name, email: user.email };
    const message = withTrailers(`${summary}\n\n${p.files.map((f) => `- ${f.content === null ? "delete" : "write"} ${f.path}`).join("\n")}`, [
      ["Changed-Via", `avi-websites-mcp (${p.tool})`],
      [SIGNATURE_TRAILER, commitSignature(cfg.commitSigningKey, tree, state.headSha, author.email)],
    ]);
    const sha = await gh.createCommit({ message, tree, parents: [state.headSha], author, committer: { name: bot.name, email: bot.email } });

    let pr = state.change;
    if (!pr) {
      await gh.createBranch(branch, sha);
      pr = await gh.createPull({
        title: `[${site.id}] ${summary}`,
        body: `${summary}\n\nMade in Claude by ${user.name} (${user.email}) through the avi-websites MCP server.\n\n${metaBlock(site, user)}`,
        head: branch,
        base: MAIN,
      });
      await gh.addLabels(pr.number, ["mcp", siteLabel(site)]);
    } else {
      try {
        await gh.updateBranch(branch, sha);
      } catch (e) {
        if ((e as { status?: number }).status === 422) {
          throw new ToolError("change_moved", "the change was updated at the same time; read it again and retry");
        }
        throw e;
      }
    }
    await gh.comment(pr.number, `**${p.tool}** by ${user.name}: ${p.comment}`);
    return { changeId: pr.number, branch, prUrl: gh.pullUrl(pr.number), headSha: sha, title: pr.title };
  }

  async function checkList(site: SiteConfig, sha: string): Promise<(CheckInfo & { ownVercel: boolean })[]> {
    return (await gh.checks(sha)).map((c) => ({ ...c, ownVercel: c.name === site.vercel.statusContext }));
  }

  async function approvalOf(pr: PullInfo): Promise<{ required: boolean; approved: boolean }> {
    if (!cfg.requireApproval) return { required: false, approved: false };
    const latest = new Map<string, { state: string; commitId: string }>();
    for (const r of await gh.listReviews(pr.number)) {
      if (r.isBot || r.state === "COMMENTED" || r.state === "PENDING") continue;
      latest.set(r.user, r); // reviews come oldest first
    }
    const approved = [...latest.values()].some((r) => r.state === "APPROVED" && r.commitId === pr.headSha);
    const blocked = [...latest.values()].some((r) => r.state === "CHANGES_REQUESTED");
    return { required: true, approved: approved && !blocked };
  }

  async function draftsIn(site: SiteConfig, pr: PullInfo, repoFiles: string[]): Promise<DraftPage[]> {
    const files: { path: string; content: string }[] = [];
    for (const f of repoFiles) {
      const rel = siteRelative(site, f);
      if (!rel || !/\.(json|md)$/.test(rel)) continue;
      const buf = await gh.readFile(pr.headSha, f);
      if (buf) files.push({ path: rel, content: buf.toString("utf8") });
    }
    return findDrafts(site, files);
  }

  async function status(site: SiteConfig, changeId: number): Promise<PreviewStatus & { pr: PullInfo }> {
    const pr = await gh.getPull(changeId);
    if (!pr || !pr.labels.includes("mcp") || !pr.labels.includes(siteLabel(site))) throw new ToolError("change_not_found", `change ${changeId} doesn't exist for ${site.id}`);
    const [deployment, checks, approval, files] = await Promise.all([
      gh.deployment(pr.headSha, site.vercel.previewEnvironment),
      checkList(site, pr.headSha),
      approvalOf(pr),
      gh.listPullFiles(pr.number),
    ]);
    let state: PreviewStatus["state"] = deployment?.state ?? "missing";
    if (!deployment) {
      const own = checks.find((c) => c.ownVercel);
      if (own) state = own.state === "success" ? "ready" : own.state === "pending" ? "building" : own.state === "failure" ? "failed" : "missing";
    }
    return {
      pr,
      state,
      url: deployment?.url ?? null,
      headSha: pr.headSha,
      checks: checks.map((c) => ({ name: c.name, state: c.state })),
      approval: approval.required ? (approval.approved ? "approved" : "required") : "not_required",
      files,
      drafts: await draftsIn(site, pr, files),
    };
  }

  async function gates(site: SiteConfig, changeId: number): Promise<{ result: GateResult; status: Awaited<ReturnType<typeof status>>; commits: Awaited<ReturnType<GitHubPort["listPullCommits"]>> }> {
    const st = await status(site, changeId);
    const { pr } = st;
    const [commits, checks, approval] = await Promise.all([gh.listPullCommits(pr.number), checkList(site, pr.headSha), approvalOf(pr)]);
    const result = evaluatePublish(
      site,
      {
        pr: { number: pr.number, state: pr.state, merged: pr.merged, labels: pr.labels, siteId: pr.labels.includes(siteLabel(site)) ? site.id : null, headSha: pr.headSha, mergeable: pr.mergeable },
        files: st.files,
        commits: commits.map((c) => ({ sha: c.sha, tree: c.tree, parents: c.parents, authorEmail: c.author.email, message: c.message, verified: c.verified })),
        preview: { state: st.state, sha: st.state === "missing" ? null : pr.headSha },
        checks,
        approval,
      },
      cfg.commitSigningKey,
    );
    return { result, status: st, commits };
  }

  async function publish(site: SiteConfig, user: User, changeId: number) {
    const { result, status: st, commits } = await gates(site, changeId);
    if (!result.ok) return { published: false as const, result, status: st };
    const { pr } = st;
    const authors = [...new Map(commits.map((c) => [c.author.email.toLowerCase(), c.author])).values()];
    const summary = pr.body.split(/\n\s*\n/)[0]?.trim() ?? "";
    const title = `${pr.title} (#${pr.number})`;
    const files = st.files.map((f) => `- ${siteRelative(site, f) ?? f}`).join("\n");
    const message = withTrailers(`${summary}\n\n${files}`, [
      ...authors.map((a): [string, string] => ["Co-authored-by", `${a.name} <${a.email}>`]),
      ["Published-by", `${user.name} <${user.email}>`],
      ["Changed-Via", "avi-websites-mcp"],
    ]);
    try {
      const merged = await gh.mergePull(pr.number, { sha: pr.headSha, title, message });
      await gh.deleteBranch(pr.headRef).catch(() => {});
      return { published: true as const, mergedSha: merged.sha, result, status: st };
    } catch (e) {
      const code = (e as { status?: number }).status;
      if (code === 409) throw new ToolError("change_moved", "the change was updated while publishing; check the preview again");
      if (code === 405) throw new ToolError("merge_refused", "GitHub refused the merge (for example a conflict); nothing was published");
      throw e;
    }
  }

  /** A new change that restores every file a published change touched. */
  async function undo(site: SiteConfig, user: User, changeId: number): Promise<Change & { revertsChange: number }> {
    const pr = await gh.getPull(changeId);
    if (!pr || !pr.labels.includes("mcp") || !pr.labels.includes(siteLabel(site))) throw new ToolError("change_not_found", `change ${changeId} doesn't exist for ${site.id}`);
    if (!pr.merged || !pr.mergeCommitSha) throw new ToolError("not_published", `change ${changeId} isn't published, so there's nothing to undo (use discard_change for an open change)`);
    const squash = await gh.getCommit(pr.mergeCommitSha);
    const before = squash.parents[0];
    const changed = await gh.diffFiles(before, squash.sha);
    const main = await mainState(site);
    const files: FileWrite[] = [];
    for (const f of changed) {
      for (const repoPath of [f.path, ...(f.previousPath ? [f.previousPath] : [])]) {
        const rel = siteRelative(site, repoPath);
        if (!rel || !isWritable(site, rel)) throw new ToolError("undo_refused", `${repoPath} isn't a content file, so this change can't be undone here`);
        const [atMerge, now] = await Promise.all([gh.readFile(squash.sha, repoPath), main.read(rel)]);
        const same = atMerge === null ? now === null : now !== null && atMerge.equals(now);
        if (!same) throw new ToolError("undo_conflict", `${rel} has changed since change ${changeId} was published; undo it by editing instead`);
        files.push({ path: rel, content: await gh.readFile(before, repoPath) });
      }
    }
    if (!files.length) throw new ToolError("undo_refused", "the published change has no files to restore");
    const title = pr.title.replace(/^\[[^\]]+\]\s*/, "");
    const change = await write({ state: main, user, summary: `Undo: ${title}`, tool: "undo", files, comment: `reverts #${changeId}` });
    return { ...change, revertsChange: changeId };
  }

  async function discard(site: SiteConfig, user: User, changeId: number) {
    const pr = await openChange(site, changeId);
    await gh.comment(pr.number, `**discard_change** by ${user.name}`);
    await gh.closePull(pr.number);
    await gh.deleteBranch(pr.headRef);
  }

  async function list(p: { site?: SiteConfig; state: "open" | "published" | "all"; mine?: string; limit: number }) {
    const pulls = await gh.listPulls({ state: p.state === "open" ? "open" : p.state === "published" ? "closed" : "all", label: "mcp", limit: 100 });
    return pulls
      .filter((pr) => (p.state !== "published" || pr.merged) && (!p.site || pr.labels.includes(siteLabel(p.site))))
      .map((pr) => ({ pr, meta: readMeta(pr.body) }))
      .filter(({ meta }) => !p.mine || meta.createdBy === p.mine)
      .slice(0, p.limit);
  }

  /** The site id a change belongs to (from its `site:` label), or null. */
  async function siteIdOf(changeId: number): Promise<string | null> {
    const pr = await gh.getPull(changeId);
    if (!pr || !pr.labels.includes("mcp")) return null;
    return pr.labels.find((l) => l.startsWith("site:"))?.slice(5) ?? null;
  }

  return { branchState, mainState, write, status, gates, publish, undo, discard, list, checkDrift, siteIdOf, pullUrl: gh.pullUrl, gh };
}
