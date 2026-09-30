import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse } from "yaml";

/**
 * Runs the script of .github/workflows/main-guard.yml exactly as written, against a fake `gh`
 * that answers from fixtures (`jq` is used as on GitHub's runners).
 */
const workflowPath = path.resolve(import.meta.dirname, "../../.github/workflows/main-guard.yml");
const workflow = parse(fs.readFileSync(workflowPath, "utf8"));
const step = workflow.jobs.guard.steps[0];
const issueStep = workflow.jobs.guard.steps[1];

type Commit = { parents: string[]; message: string; author?: string };
type Pull = { number: number; merged_at: string | null; merge_commit_sha: string };

const sha = (c: string) => c.repeat(40).slice(0, 40);

type Issue = { number: number; title: string; pull_request?: object };

function run(p: {
  before: string;
  after: string;
  forced?: boolean;
  commits: Record<string, Commit>;
  pulls: Record<string, Pull[]>;
  failApi?: boolean;
  issues?: Issue[];
  /** Run the alert step after the check, as `if: failure()` does. */
  withIssueStep?: boolean;
  /** Run only the alert step, as after a check that crashed before writing its report. */
  onlyIssueStep?: boolean;
}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "main-guard-"));
  const fixtures = path.join(dir, "fixtures");
  fs.mkdirSync(fixtures);
  for (const [s, c] of Object.entries(p.commits)) {
    const name = c.author ?? "Jane";
    fs.writeFileSync(
      path.join(fixtures, `commits_${s}`),
      JSON.stringify({ sha: s, parents: c.parents.map((x) => ({ sha: x })), commit: { message: c.message, author: { name, email: `${name.toLowerCase()}@avilabs.is` }, committer: { name } } }),
    );
    fs.writeFileSync(path.join(fixtures, `pulls_${s}`), JSON.stringify(p.pulls[s] ?? []));
  }
  const bin = path.join(dir, "bin");
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(fixtures, "issues"), JSON.stringify(p.issues ?? []));
  const calls = path.join(dir, "calls.log");
  // gh api [--method POST] <path> [--input -]. GETs answer from fixtures; POSTs are recorded
  // with their JSON body in calls.log.
  fs.writeFileSync(
    path.join(bin, "gh"),
    `#!/bin/sh
[ -n "$FAIL_API" ] && { echo "HTTP 502" >&2; exit 1; }
shift
method=GET
[ "$1" = "--method" ] && { method="$2"; shift 2; }
api="$1"
if [ "$method" = POST ]; then
  printf '%s %s %s\\n' "$method" "$api" "$(jq -c .)" >> "$CALLS"
  echo '{}'
  exit 0
fi
case "$api" in
  repos/*/*/issues\\?*) cat "$FIXTURES/issues"; exit 0 ;;
esac
rest=\${api#repos/*/*/commits/}
case "$rest" in
  */pulls) f="$FIXTURES/pulls_\${rest%/pulls}" ;;
  *) f="$FIXTURES/commits_$rest" ;;
esac
[ -f "$f" ] || { echo "HTTP 404: $api" >&2; exit 1; }
cat "$f"
`,
  );
  fs.chmodSync(path.join(bin, "gh"), 0o755);
  const summary = path.join(dir, "summary.md");
  const env = {
    PATH: `${bin}:${process.env.PATH}`,
    FIXTURES: fixtures,
    CALLS: calls,
    REPORT: path.join(dir, "main-guard-report.md"),
    OWNER: "Tomassv",
    RUN_URL: "https://github.com/avilabs/avi-websites/actions/runs/42",
    GITHUB_STEP_SUMMARY: summary,
    GH_TOKEN: "t",
    REPO: "avilabs/avi-websites",
    BEFORE: p.before,
    AFTER: p.after,
    FORCED: p.forced ? "true" : "false",
    PUSHER: "someone",
    RETRY_SECONDS: "0",
    ...(p.failApi ? { FAIL_API: "1" } : {}),
  };
  assert.deepEqual(Object.keys(step.env).sort(), ["AFTER", "BEFORE", "FORCED", "GH_TOKEN", "PUSHER", "REPO", "REPORT", "RETRY_SECONDS"]);
  assert.deepEqual(Object.keys(issueStep.env).sort(), ["AFTER", "GH_TOKEN", "OWNER", "PUSHER", "REPO", "REPORT", "RUN_URL"]);
  const r = p.onlyIssueStep ? { status: 1, stdout: "", stderr: "" } : spawnSync("bash", ["-c", step.run], { env, encoding: "utf8" });
  let issue: { status: number | null; out: string } | null = null;
  if ((p.withIssueStep || p.onlyIssueStep) && r.status !== 0) {
    const i = spawnSync("bash", ["-c", issueStep.run], { env, encoding: "utf8" });
    issue = { status: i.status, out: i.stdout + i.stderr };
  }
  const posts = fs.existsSync(calls)
    ? fs.readFileSync(calls, "utf8").trim().split("\n").map((line) => {
        const [method, api, ...body] = line.split(" ");
        return { method, api, body: JSON.parse(body.join(" ")) as { title?: string; body: string } };
      })
    : [];
  return { status: r.status, out: r.stdout + r.stderr, summary: fs.existsSync(summary) ? fs.readFileSync(summary, "utf8") : "", issue, posts };
}

const merged = (n: number, s: string): Pull => ({ number: n, merged_at: "2026-09-30T12:00:00Z", merge_commit_sha: s });
const [A, B, C, D, E] = ["a", "b", "c", "d", "e"].map(sha);

test("permissions, the push-to-main trigger, and the alert step only on failure", () => {
  assert.deepEqual(workflow.permissions, { contents: "read", "pull-requests": "read", issues: "write" });
  assert.deepEqual(workflow.on, { push: { branches: ["main"] } });
  assert.equal(issueStep.if, "failure()");
  for (const s of [step, issueStep]) assert.ok(!/\$\{\{/.test(s.run), "no expressions are interpolated into the scripts");
});

test("a squash merge of an MCP change passes", () => {
  const r = run({ before: A, after: B, commits: { [B]: { parents: [A], message: "[cura.aero] Hero (#7)" } }, pulls: { [B]: [merged(7, B)] } });
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /merge\/squash commit of #7/);
});

test("a merge commit passes; the PR's own commits (second parent) aren't checked", () => {
  // A ← M (merge of #3), with the PR's commits C, D on the second parent.
  const r = run({
    before: A,
    after: E,
    commits: { [E]: { parents: [A, D], message: "Merge pull request #3" }, [D]: { parents: [C], message: "wip" }, [C]: { parents: [A], message: "wip" } },
    pulls: { [E]: [merged(3, E)], [D]: [merged(3, E)] },
  });
  assert.equal(r.status, 0, r.out);
});

test("several merged PRs in one push pass", () => {
  const r = run({
    before: A,
    after: C,
    commits: { [C]: { parents: [B], message: "second" }, [B]: { parents: [A], message: "first" } },
    pulls: { [C]: [merged(9, C)], [B]: [merged(8, B)] },
  });
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /All 2 pushed commit\(s\)/);
});

test("a direct push fails and names the commit", () => {
  const r = run({ before: A, after: B, commits: { [B]: { parents: [A], message: "quick fix\n\nbody", author: "Mallory" } }, pulls: {} });
  assert.equal(r.status, 1);
  assert.match(r.out, /::error title=main changed without a pull request::/);
  assert.match(r.out, /bbbbbbb "quick fix" by Mallory <mallory@avilabs\.is>/);
  assert.match(r.summary, /Pushed by \*\*someone\*\*/);
});

test("a direct commit on top of a merged PR fails", () => {
  const r = run({
    before: A,
    after: C,
    commits: { [C]: { parents: [B], message: "sneaky" }, [B]: { parents: [A], message: "[cura.aero] ok (#5)" } },
    pulls: { [B]: [merged(5, B)] },
  });
  assert.equal(r.status, 1);
  assert.match(r.out, /ccccccc "sneaky"/);
  assert.doesNotMatch(r.out, /bbbbbbb "\[cura/);
});

test("a PR's branch commit pushed straight to main fails (it isn't the merge commit)", () => {
  const r = run({ before: A, after: B, commits: { [B]: { parents: [A], message: "from a branch" } }, pulls: { [B]: [{ number: 4, merged_at: null, merge_commit_sha: D }] } });
  assert.equal(r.status, 1);
});

test("force pushes, recreating and deleting main fail", () => {
  const zero = "0".repeat(40);
  assert.match(run({ before: A, after: B, forced: true, commits: {}, pulls: {} }).out, /force-pushed/);
  assert.match(run({ before: zero, after: B, commits: {}, pulls: {} }).out, /created or recreated/);
  assert.match(run({ before: A, after: zero, commits: {}, pulls: {} }).out, /deleted/);
});

test("history that doesn't lead back to the previous head fails", () => {
  const r = run({ before: A, after: C, commits: { [C]: { parents: [B], message: "x" }, [B]: { parents: [], message: "root" } }, pulls: { [C]: [merged(1, C)], [B]: [merged(2, B)] } });
  assert.equal(r.status, 1);
  assert.match(r.out, /history was rewritten/);
});

test("an API failure fails the run instead of passing silently", () => {
  const r = run({ before: A, after: B, commits: { [B]: { parents: [A], message: "x" } }, pulls: { [B]: [merged(7, B)] }, failApi: true });
  assert.notEqual(r.status, 0);
});

// ── The alert issue ──

const TITLE = "main-guard: unexpected push to main";
const directPush = { before: A, after: B, commits: { [B]: { parents: [A], message: "quick fix", author: "Mallory" } }, pulls: {} };

test("a bad push opens an issue that mentions the owner and lists the commits and the pusher", () => {
  const r = run({ ...directPush, withIssueStep: true });
  assert.equal(r.status, 1);
  assert.equal(r.issue!.status, 0, r.issue!.out);
  assert.equal(r.posts.length, 1);
  const [post] = r.posts;
  assert.deepEqual([post.method, post.api, post.body.title], ["POST", "repos/avilabs/avi-websites/issues", TITLE]);
  assert.match(post.body.body, /^@Tomassv main changed without a pull request\./);
  assert.match(post.body.body, /- bbbbbbb "quick fix" by Mallory <mallory@avilabs\.is>/);
  assert.match(post.body.body, /Pushed by \*\*someone\*\*/);
  assert.match(post.body.body, /Run: https:\/\/github\.com\/avilabs\/avi-websites\/actions\/runs\/42/);
});

test("an open alert issue gets a comment instead of a second issue", () => {
  const r = run({ ...directPush, withIssueStep: true, issues: [{ number: 12, title: "something else" }, { number: 31, title: TITLE }] });
  assert.equal(r.posts.length, 1);
  assert.equal(r.posts[0].api, "repos/avilabs/avi-websites/issues/31/comments");
  assert.equal(r.posts[0].body.title, undefined);
  assert.match(r.posts[0].body.body, /bbbbbbb "quick fix"/);
  assert.match(r.issue!.out, /Commented on issue #31/);
});

test("a pull request with the same title isn't taken for the alert issue", () => {
  const r = run({ ...directPush, withIssueStep: true, issues: [{ number: 5, title: TITLE, pull_request: {} }] });
  assert.equal(r.posts[0].api, "repos/avilabs/avi-websites/issues");
});

test("force pushes and deleted main are reported in the issue too", () => {
  const r = run({ before: A, after: B, forced: true, commits: {}, pulls: {}, withIssueStep: true });
  assert.match(r.posts[0].body.body, /force-pushed/);
});

test("a check that crashed before writing its report still opens an issue", () => {
  const r = run({ ...directPush, onlyIssueStep: true });
  assert.equal(r.issue!.status, 0, r.issue!.out);
  assert.match(r.posts[0].body.body, /couldn't check this push/);
  assert.match(r.posts[0].body.body, /Pushed by \*\*someone\*\*, new head `bbbbbbb/);
});

test("a clean push opens nothing", () => {
  const r = run({ before: A, after: B, commits: { [B]: { parents: [A], message: "ok" } }, pulls: { [B]: [merged(7, B)] }, withIssueStep: true });
  assert.equal(r.status, 0);
  assert.equal(r.issue, null);
  assert.equal(r.posts.length, 0);
});
