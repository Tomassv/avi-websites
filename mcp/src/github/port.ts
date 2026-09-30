/**
 * The GitHub operations the server uses, as an interface: src/github/octokit.ts implements it
 * with the GitHub App, and test/helpers/fake-github.ts with an in-memory repository.
 */
export type Person = { name: string; email: string };

export type CommitInfo = {
  sha: string;
  tree: string;
  parents: string[];
  message: string;
  author: Person;
  committer: Person;
  /** GitHub's own signature check ("Verified"); informational only. */
  verified: boolean;
};

export type TreeEntry = { path: string; type: "blob" | "tree"; sha: string };

export type PullInfo = {
  number: number;
  state: "open" | "closed";
  merged: boolean;
  /** null while GitHub is still computing it. */
  mergeable: boolean | null;
  title: string;
  body: string;
  labels: string[];
  headRef: string;
  headSha: string;
  baseRef: string;
  mergeCommitSha: string | null;
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  htmlUrl: string;
};

export type Review = { user: string; isBot: boolean; state: string; commitId: string; submittedAt: string };

export type DeploymentState = { state: "queued" | "building" | "ready" | "failed"; url: string | null; description: string | null };

export type CheckInfo = { name: string; state: "success" | "neutral" | "skipped" | "pending" | "failure"; description: string | null };

export interface GitHubPort {
  getBranchSha(branch: string): Promise<string | null>;
  createBranch(branch: string, sha: string): Promise<void>;
  /** Fast-forward only; rejects if the branch moved. */
  updateBranch(branch: string, sha: string): Promise<void>;
  deleteBranch(branch: string): Promise<void>;

  getCommit(sha: string): Promise<CommitInfo>;
  /** Recursive listing of a commit's tree, filtered to a path prefix. */
  listTree(commitSha: string, prefix: string): Promise<TreeEntry[]>;
  readFile(ref: string, path: string): Promise<Buffer | null>;
  /** Blob SHAs of the files directly in a directory, by repo path. */
  listDir(ref: string, path: string): Promise<Record<string, string>>;
  /** Files that differ between two commits. */
  diffFiles(base: string, head: string): Promise<{ path: string; status: "added" | "modified" | "removed" | "renamed"; previousPath?: string }[]>;

  createBlob(content: Buffer): Promise<string>;
  /** `sha: null` deletes the path. */
  createTree(baseTree: string, entries: { path: string; sha: string | null }[]): Promise<string>;
  createCommit(p: { message: string; tree: string; parents: string[]; author: Person; committer: Person }): Promise<string>;

  createPull(p: { title: string; body: string; head: string; base: string }): Promise<PullInfo>;
  getPull(number: number): Promise<PullInfo | null>;
  listPulls(p: { state: "open" | "closed" | "all"; label: string; limit: number }): Promise<PullInfo[]>;
  closePull(number: number): Promise<void>;
  addLabels(number: number, labels: string[]): Promise<void>;
  comment(number: number, body: string): Promise<void>;
  listPullCommits(number: number): Promise<CommitInfo[]>;
  listPullFiles(number: number): Promise<string[]>;
  mergePull(number: number, p: { sha: string; title: string; message: string }): Promise<{ sha: string }>;
  listReviews(number: number): Promise<Review[]>;

  /** The site's Vercel preview for a commit, from GitHub deployments (null if none yet). */
  deployment(sha: string, environment: string): Promise<DeploymentState | null>;
  /** Commit statuses and check runs on a commit. */
  checks(sha: string): Promise<CheckInfo[]>;
  /** Status checks required on a branch by rulesets or branch protection. */
  requiredChecks(branch: string): Promise<string[]>;

  /** The App's bot identity, used as committer. */
  botIdentity(): Promise<Person & { login: string }>;
  pullUrl(number: number): string;
}
