import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { CheckInfo, CommitInfo, DeploymentState, GitHubPort, Person, PullInfo, Review } from "./port.ts";

/**
 * An in-memory repository behind GitHubPort. Tests drive it directly; DRY_RUN=1 seeds it from
 * the local checkout, so the whole flow (branches, PRs, publish) runs locally and nothing is
 * written to GitHub. Trees are flat path→blob maps; squash merges apply the PR's diff to main.
 */
export type MemoryRepo = GitHubPort & {
  previews: Map<string, DeploymentState>;
  checkResults: Map<string, CheckInfo[]>;
  reviews: Map<number, Review[]>;
  required: string[];
  pulls: PullInfo[];
  pullBase: Map<number, string>;
  comments: Map<number, string[]>;
  /** Makes a commit on a branch directly, as if someone pushed by hand. */
  pushDirect(branch: string, files: Record<string, string | null>, message: string, author: Person): Promise<string>;
};

const sha1 = (s: string | Buffer) => createHash("sha1").update(s).digest("hex");
const blobSha = (b: Buffer) => createHash("sha1").update(`blob ${b.length}\0`).update(b).digest("hex");

export const BOT: Person & { login: string } = { login: "avi-websites[bot]", name: "avi-websites[bot]", email: "1+avi-websites[bot]@users.noreply.github.com" };

export function memoryRepo(initial: Record<string, string | Buffer> = {}, opts: { previewUrl?: string | null } = {}): MemoryRepo {
  const blobs = new Map<string, Buffer>();
  const trees = new Map<string, Map<string, string>>();
  const commits = new Map<string, CommitInfo>();
  const refs = new Map<string, string>();
  const pulls: PullInfo[] = [];
  const pullBase = new Map<number, string>();
  const comments = new Map<number, string[]>();
  let clock = 0;
  const now = () => new Date(Date.UTC(2026, 8, 30, 12, 0, clock++)).toISOString();

  function putTree(map: Map<string, string>): string {
    const sha = sha1([...map].sort(([a], [b]) => (a < b ? -1 : 1)).map(([p, s]) => `${p}\0${s}`).join("\n"));
    trees.set(sha, new Map(map));
    return sha;
  }
  function putCommit(c: Omit<CommitInfo, "sha" | "verified">): string {
    const sha = sha1(JSON.stringify([c, clock++]));
    commits.set(sha, { ...c, sha, verified: c.committer.email === BOT.email });
    return sha;
  }
  const resolve = (ref: string) => refs.get(ref) ?? (commits.has(ref) ? ref : null);
  const treeOf = (commitSha: string) => trees.get(commits.get(commitSha)!.tree)!;

  const initialMap = new Map<string, string>();
  for (const [p, content] of Object.entries(initial)) {
    const b = Buffer.isBuffer(content) ? content : Buffer.from(content);
    const s = blobSha(b);
    blobs.set(s, b);
    initialMap.set(p, s);
  }
  const root = putCommit({ tree: putTree(initialMap), parents: [], message: "Initial", author: BOT, committer: BOT });
  refs.set("main", root);

  function diff(a: Map<string, string>, b: Map<string, string>) {
    const out: { path: string; status: "added" | "modified" | "removed" }[] = [];
    for (const [p, s] of b) if (!a.has(p)) out.push({ path: p, status: "added" });
    else if (a.get(p) !== s) out.push({ path: p, status: "modified" });
    for (const p of a.keys()) if (!b.has(p)) out.push({ path: p, status: "removed" });
    return out;
  }

  function mergeability(pr: PullInfo): boolean {
    const base = treeOf(pullBase.get(pr.number)!);
    const head = treeOf(refs.get(pr.headRef)!);
    const main = treeOf(refs.get("main")!);
    return diff(base, head).every((d) => main.get(d.path) === base.get(d.path));
  }

  function refresh(pr: PullInfo): PullInfo {
    if (pr.state === "open") {
      pr.headSha = refs.get(pr.headRef) ?? pr.headSha;
      pr.mergeable = mergeability(pr);
    }
    return { ...pr, labels: [...pr.labels] };
  }

  const repo: MemoryRepo = {
    previews: new Map(),
    checkResults: new Map(),
    reviews: new Map(),
    required: [],
    pulls,
    pullBase,
    comments,

    async getBranchSha(branch) {
      return refs.get(branch) ?? null;
    },
    async createBranch(branch, sha) {
      if (refs.has(branch)) throw Object.assign(new Error("Reference already exists"), { status: 422 });
      refs.set(branch, sha);
    },
    async updateBranch(branch, sha) {
      const current = refs.get(branch);
      if (!current) throw Object.assign(new Error("not found"), { status: 404 });
      let c: string | undefined = sha;
      while (c && c !== current) c = commits.get(c)?.parents[0];
      if (c !== current) throw Object.assign(new Error("Update is not a fast forward"), { status: 422 });
      refs.set(branch, sha);
    },
    async deleteBranch(branch) {
      refs.delete(branch);
    },

    async getCommit(sha) {
      const c = commits.get(sha);
      if (!c) throw Object.assign(new Error("No commit"), { status: 404 });
      return { ...c };
    },
    async listTree(commitSha, prefix) {
      const t = treeOf(commitSha);
      return [...t].filter(([p]) => p.startsWith(`${prefix}/`)).map(([p, s]) => ({ path: p, type: "blob" as const, sha: s }));
    },
    async readFile(ref, p) {
      const c = resolve(ref);
      const s = c ? treeOf(c).get(p) : undefined;
      return s ? Buffer.from(blobs.get(s)!) : null;
    },
    async listDir(ref, dir) {
      const c = resolve(ref);
      if (!c) return {};
      return Object.fromEntries([...treeOf(c)].filter(([p]) => p.startsWith(`${dir}/`) && !p.slice(dir.length + 1).includes("/")));
    },
    async diffFiles(base, head) {
      return diff(treeOf(base), treeOf(head));
    },

    async createBlob(content) {
      const s = blobSha(content);
      blobs.set(s, Buffer.from(content));
      return s;
    },
    async createTree(baseTree, entries) {
      const map = new Map(trees.get(baseTree)!);
      for (const e of entries) {
        if (e.sha === null) map.delete(e.path);
        else {
          if (!blobs.has(e.sha)) throw new Error(`no blob ${e.sha}`);
          map.set(e.path, e.sha);
        }
      }
      return putTree(map);
    },
    async createCommit(p) {
      for (const parent of p.parents) if (!commits.has(parent)) throw new Error(`no parent ${parent}`);
      return putCommit({ tree: p.tree, parents: p.parents, message: p.message, author: p.author, committer: p.committer });
    },

    async createPull(p) {
      if (!refs.has(p.head)) throw Object.assign(new Error("head not found"), { status: 422 });
      const number = pulls.length + 1;
      const t = now();
      const pr: PullInfo = {
        number,
        state: "open",
        merged: false,
        mergeable: null,
        title: p.title,
        body: p.body,
        labels: [],
        headRef: p.head,
        headSha: refs.get(p.head)!,
        baseRef: p.base,
        mergeCommitSha: null,
        createdAt: t,
        updatedAt: t,
        mergedAt: null,
        htmlUrl: repo.pullUrl(number),
      };
      pulls.push(pr);
      // The merge base: the latest main commit the branch contains.
      let c: string | undefined = refs.get(p.head);
      const mainHistory = new Set<string>();
      for (let m: string | undefined = refs.get("main"); m; m = commits.get(m)?.parents[0]) mainHistory.add(m);
      while (c && !mainHistory.has(c)) c = commits.get(c)?.parents[0];
      pullBase.set(number, c ?? refs.get("main")!);
      return refresh(pr);
    },
    async getPull(number) {
      const pr = pulls.find((p) => p.number === number);
      return pr ? refresh(pr) : null;
    },
    async listPulls({ state, label, limit }) {
      return pulls
        .filter((p) => (state === "all" || p.state === state) && p.labels.includes(label))
        .map(refresh)
        .reverse()
        .slice(0, limit);
    },
    async closePull(number) {
      const pr = pulls.find((p) => p.number === number)!;
      pr.state = "closed";
      pr.updatedAt = now();
    },
    async addLabels(number, labels) {
      const pr = pulls.find((p) => p.number === number)!;
      for (const l of labels) if (!pr.labels.includes(l)) pr.labels.push(l);
    },
    async comment(number, body) {
      comments.set(number, [...(comments.get(number) ?? []), body]);
    },
    async listPullCommits(number) {
      const pr = pulls.find((p) => p.number === number)!;
      const base = pullBase.get(number)!;
      const out: CommitInfo[] = [];
      for (let c: string | undefined = pr.state === "open" ? refs.get(pr.headRef) : pr.headSha; c && c !== base; c = commits.get(c)?.parents[0]) {
        out.unshift({ ...commits.get(c)! });
      }
      return out;
    },
    async listPullFiles(number) {
      const pr = pulls.find((p) => p.number === number)!;
      return diff(treeOf(pullBase.get(number)!), treeOf(refs.get(pr.headRef) ?? pr.headSha)).map((d) => d.path);
    },
    async mergePull(number, p) {
      const pr = pulls.find((x) => x.number === number)!;
      const head = refs.get(pr.headRef)!;
      if (head !== p.sha) throw Object.assign(new Error("Head branch was modified"), { status: 409 });
      if (!mergeability(pr)) throw Object.assign(new Error("Merge conflict"), { status: 405 });
      const main = new Map(treeOf(refs.get("main")!));
      const headTree = treeOf(head);
      for (const d of diff(treeOf(pullBase.get(number)!), headTree)) {
        if (d.status === "removed") main.delete(d.path);
        else main.set(d.path, headTree.get(d.path)!);
      }
      const sha = putCommit({ tree: putTree(main), parents: [refs.get("main")!], message: `${p.title}\n\n${p.message}`, author: BOT, committer: BOT });
      refs.set("main", sha);
      Object.assign(pr, { state: "closed", merged: true, mergeCommitSha: sha, mergedAt: now(), updatedAt: now(), headSha: head });
      return { sha };
    },
    async listReviews(number) {
      return repo.reviews.get(number) ?? [];
    },

    async deployment(sha) {
      if (repo.previews.has(sha)) return repo.previews.get(sha)!;
      return opts.previewUrl === undefined ? null : { state: "ready", url: opts.previewUrl, description: "dry run" };
    },
    async checks(sha) {
      return repo.checkResults.get(sha) ?? [];
    },
    async requiredChecks() {
      return repo.required;
    },
    async botIdentity() {
      return BOT;
    },
    pullUrl(number) {
      return `https://github.com/dry-run/dry-run/pull/${number}`;
    },

    async pushDirect(branch, files, message, author) {
      const parent = refs.get(branch)!;
      const map = new Map(treeOf(parent));
      for (const [p, content] of Object.entries(files)) {
        if (content === null) map.delete(p);
        else map.set(p, await repo.createBlob(Buffer.from(content)));
      }
      const sha = putCommit({ tree: putTree(map), parents: [parent], message, author, committer: author });
      refs.set(branch, sha);
      return sha;
    },
  };
  return repo;
}

/** Reads a checkout into memory, for DRY_RUN. Skips git data, dependencies and build output. */
export function readCheckout(root: string): Record<string, Buffer> {
  const skip = new Set([".git", "node_modules", ".next", ".vercel", "generated", ".DS_Store"]);
  const out: Record<string, Buffer> = {};
  const walk = (rel: string) => {
    for (const d of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
      if (skip.has(d.name) || d.name.startsWith(".env")) continue;
      const child = rel ? `${rel}/${d.name}` : d.name;
      if (d.isDirectory()) walk(child);
      else if (d.isFile()) out[child] = fs.readFileSync(path.join(root, child));
    }
  };
  walk("");
  return out;
}
