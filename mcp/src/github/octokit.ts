import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import type { Config } from "../config.ts";
import type { CheckInfo, CommitInfo, DeploymentState, GitHubPort, PullInfo, TreeEntry } from "./port.ts";

/**
 * GitHubPort over the REST API, authenticated as the GitHub App installation. Octokit caches
 * and renews the installation token itself.
 */
export function octokitPort(cfg: Config): GitHubPort {
  const { appId, privateKey, installationId, owner, repo } = cfg.github;
  const gh = new Octokit({ authStrategy: createAppAuth, auth: { appId, privateKey, installationId }, userAgent: "avi-websites-mcp" });
  const r = { owner, repo };
  let bot: (CommitInfo["author"] & { login: string }) | null = null;

  const notFound = (e: unknown) => (e as { status?: number }).status === 404;

  const toPull = (p: any): PullInfo => ({
    number: p.number,
    state: p.state,
    merged: Boolean(p.merged ?? p.merged_at),
    mergeable: p.mergeable ?? null,
    title: p.title,
    body: p.body ?? "",
    labels: (p.labels ?? []).map((l: any) => (typeof l === "string" ? l : l.name)),
    headRef: p.head.ref,
    headSha: p.head.sha,
    baseRef: p.base.ref,
    mergeCommitSha: p.merge_commit_sha ?? null,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    mergedAt: p.merged_at ?? null,
    htmlUrl: p.html_url,
  });

  const toCommit = (c: any): CommitInfo => ({
    sha: c.sha,
    tree: c.commit.tree.sha,
    parents: c.parents.map((p: any) => p.sha),
    message: c.commit.message,
    author: { name: c.commit.author?.name ?? "", email: c.commit.author?.email ?? "" },
    committer: { name: c.commit.committer?.name ?? "", email: c.commit.committer?.email ?? "" },
    verified: Boolean(c.commit.verification?.verified),
  });

  async function subtreeSha(commitSha: string, prefix: string): Promise<string | null> {
    const { data: commit } = await gh.git.getCommit({ ...r, commit_sha: commitSha });
    let sha = commit.tree.sha;
    for (const seg of prefix.split("/").filter(Boolean)) {
      const { data } = await gh.git.getTree({ ...r, tree_sha: sha });
      const entry = data.tree.find((e) => e.path === seg && e.type === "tree");
      if (!entry?.sha) return null;
      sha = entry.sha;
    }
    return sha;
  }

  return {
    async getBranchSha(branch) {
      try {
        return (await gh.git.getRef({ ...r, ref: `heads/${branch}` })).data.object.sha;
      } catch (e) {
        if (notFound(e)) return null;
        throw e;
      }
    },
    async createBranch(branch, sha) {
      await gh.git.createRef({ ...r, ref: `refs/heads/${branch}`, sha });
    },
    async updateBranch(branch, sha) {
      await gh.git.updateRef({ ...r, ref: `heads/${branch}`, sha, force: false });
    },
    async deleteBranch(branch) {
      try {
        await gh.git.deleteRef({ ...r, ref: `heads/${branch}` });
      } catch (e) {
        if (!notFound(e)) throw e;
      }
    },

    async getCommit(sha) {
      return toCommit((await gh.repos.getCommit({ ...r, ref: sha, per_page: 1 })).data);
    },
    async listTree(commitSha, prefix) {
      const sha = await subtreeSha(commitSha, prefix);
      if (!sha) return [];
      const { data } = await gh.git.getTree({ ...r, tree_sha: sha, recursive: "1" });
      if (data.truncated) throw new Error(`the tree of ${prefix} is too large to list`);
      return data.tree
        .filter((e) => e.path && e.sha && (e.type === "blob" || e.type === "tree"))
        .map((e): TreeEntry => ({ path: `${prefix}/${e.path}`, type: e.type as TreeEntry["type"], sha: e.sha! }));
    },
    async readFile(ref, path) {
      try {
        const { data } = await gh.repos.getContent({ ...r, path, ref });
        if (Array.isArray(data) || data.type !== "file") return null;
        if (data.content) return Buffer.from(data.content, "base64");
        const blob = await gh.git.getBlob({ ...r, file_sha: data.sha });
        return Buffer.from(blob.data.content, "base64");
      } catch (e) {
        if (notFound(e)) return null;
        throw e;
      }
    },
    async listDir(ref, path) {
      try {
        const { data } = await gh.repos.getContent({ ...r, path, ref });
        if (!Array.isArray(data)) return {};
        return Object.fromEntries(data.filter((e) => e.type === "file").map((e) => [e.path, e.sha]));
      } catch (e) {
        if (notFound(e)) return {};
        throw e;
      }
    },
    async diffFiles(base, head) {
      const { data } = await gh.repos.compareCommitsWithBasehead({ ...r, basehead: `${base}...${head}`, per_page: 300 });
      return (data.files ?? []).map((f) => ({
        path: f.filename,
        status: (f.status === "added" || f.status === "removed" || f.status === "renamed" ? f.status : "modified") as "added" | "modified" | "removed" | "renamed",
        previousPath: f.previous_filename,
      }));
    },

    async createBlob(content) {
      return (await gh.git.createBlob({ ...r, content: content.toString("base64"), encoding: "base64" })).data.sha;
    },
    async createTree(baseTree, entries) {
      const tree = entries.map((e) => ({ path: e.path, mode: "100644" as const, type: "blob" as const, sha: e.sha }));
      return (await gh.git.createTree({ ...r, base_tree: baseTree, tree })).data.sha;
    },
    async createCommit(p) {
      return (await gh.git.createCommit({ ...r, message: p.message, tree: p.tree, parents: p.parents, author: p.author, committer: p.committer })).data.sha;
    },

    async createPull(p) {
      return toPull((await gh.pulls.create({ ...r, ...p, maintainer_can_modify: false })).data);
    },
    async getPull(number) {
      try {
        return toPull((await gh.pulls.get({ ...r, pull_number: number })).data);
      } catch (e) {
        if (notFound(e)) return null;
        throw e;
      }
    },
    async listPulls({ state, label, limit }) {
      const { data } = await gh.pulls.list({ ...r, state, sort: "updated", direction: "desc", per_page: 100 });
      return data.map(toPull).filter((p) => p.labels.includes(label)).slice(0, limit);
    },
    async closePull(number) {
      await gh.pulls.update({ ...r, pull_number: number, state: "closed" });
    },
    async addLabels(number, labels) {
      await gh.issues.addLabels({ ...r, issue_number: number, labels });
    },
    async comment(number, body) {
      await gh.issues.createComment({ ...r, issue_number: number, body });
    },
    async listPullCommits(number) {
      const commits = await gh.paginate(gh.pulls.listCommits, { ...r, pull_number: number, per_page: 100 });
      return commits.map(toCommit);
    },
    async listPullFiles(number) {
      const files = await gh.paginate(gh.pulls.listFiles, { ...r, pull_number: number, per_page: 100 });
      return files.flatMap((f) => (f.previous_filename ? [f.filename, f.previous_filename] : [f.filename]));
    },
    async mergePull(number, p) {
      const { data } = await gh.pulls.merge({ ...r, pull_number: number, sha: p.sha, merge_method: "squash", commit_title: p.title, commit_message: p.message });
      return { sha: data.sha };
    },
    async listReviews(number) {
      const reviews = await gh.paginate(gh.pulls.listReviews, { ...r, pull_number: number, per_page: 100 });
      return reviews.map((v) => ({
        user: v.user?.login ?? "",
        isBot: v.user?.type === "Bot",
        state: v.state,
        commitId: v.commit_id ?? "",
        submittedAt: v.submitted_at ?? "",
      }));
    },

    async deployment(sha, environment): Promise<DeploymentState | null> {
      const { data: deployments } = await gh.repos.listDeployments({ ...r, sha, environment, per_page: 5 });
      const latest = deployments[0];
      if (!latest) return null;
      const { data: statuses } = await gh.repos.listDeploymentStatuses({ ...r, deployment_id: latest.id, per_page: 1 });
      const s = statuses[0];
      if (!s) return { state: "queued", url: null, description: null };
      const state = s.state === "success" || s.state === "inactive" ? "ready" : s.state === "failure" || s.state === "error" ? "failed" : s.state === "in_progress" ? "building" : "queued";
      return { state, url: s.environment_url || null, description: s.description ?? null };
    },
    async checks(sha): Promise<CheckInfo[]> {
      const [{ data: combined }, runs] = await Promise.all([
        gh.repos.getCombinedStatusForRef({ ...r, ref: sha, per_page: 100 }),
        gh.paginate(gh.checks.listForRef, { ...r, ref: sha, per_page: 100 }),
      ]);
      const statuses: CheckInfo[] = combined.statuses.map((s) => ({
        name: s.context,
        state: s.state === "success" ? "success" : s.state === "pending" ? "pending" : "failure",
        description: s.description ?? null,
      }));
      const checkRuns: CheckInfo[] = runs.map((c) => ({
        name: c.name,
        state:
          c.status !== "completed"
            ? "pending"
            : c.conclusion === "success"
              ? "success"
              : c.conclusion === "neutral"
                ? "neutral"
                : c.conclusion === "skipped"
                  ? "skipped"
                  : "failure",
        description: c.output?.title ?? null,
      }));
      return [...statuses, ...checkRuns];
    },
    async requiredChecks(branch) {
      try {
        const rules = await gh.paginate(gh.repos.getBranchRules, { ...r, branch, per_page: 100 });
        return rules.flatMap((rule: any) =>
          rule.type === "required_status_checks" ? (rule.parameters?.required_status_checks ?? []).map((c: any) => c.context) : [],
        );
      } catch (e) {
        if (notFound(e) || (e as { status?: number }).status === 403) return [];
        throw e;
      }
    },

    async botIdentity() {
      if (bot) return bot;
      const app = new Octokit({ authStrategy: createAppAuth, auth: { appId, privateKey } });
      const { data } = await app.apps.getAuthenticated();
      const login = `${data!.slug}[bot]`;
      const { data: user } = await gh.users.getByUsername({ username: login });
      bot = { login, name: login, email: `${user.id}+${login}@users.noreply.github.com` };
      return bot;
    },
    pullUrl(number) {
      return `https://github.com/${owner}/${repo}/pull/${number}`;
    },
  };
}
