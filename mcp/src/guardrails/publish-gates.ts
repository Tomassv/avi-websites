import type { SiteConfig } from "../sites/types.ts";
import { isWritable, siteRelative } from "./paths.ts";
import { verifyCommitSignature, type SignedCommit } from "./signature.ts";

/**
 * The publish gates (MCP-PLAN.md §7.6), as one pure function over data read from GitHub, so
 * each gate can be tested on its own. Every failing gate is reported, not just the first.
 */
export type CheckState = "success" | "neutral" | "skipped" | "pending" | "failure";

export type PublishInput = {
  pr: {
    number: number;
    state: "open" | "closed";
    merged: boolean;
    labels: string[];
    siteId: string | null;
    headSha: string;
    /** GitHub's mergeable flag; null while GitHub is still computing it. */
    mergeable: boolean | null;
  };
  files: string[];
  commits: (SignedCommit & { verified: boolean })[];
  preview: { state: "ready" | "building" | "queued" | "failed" | "missing"; sha: string | null };
  /** Commit statuses and check runs on the head. `ownVercel` marks this site's Vercel status. */
  checks: { name: string; state: CheckState; ownVercel: boolean }[];
  approval: { required: boolean; approved: boolean };
};

export type GateResult = { ok: boolean; failures: { gate: number; message: string }[]; notes: string[] };

export function evaluatePublish(site: SiteConfig, input: PublishInput, signingSecret: Uint8Array): GateResult {
  const failures: GateResult["failures"] = [];
  const notes: string[] = [];
  const fail = (gate: number, message: string) => failures.push({ gate, message });
  const { pr } = input;

  // 1. An open mcp PR for this site, without conflicts.
  if (pr.merged) fail(1, "this change is already published");
  else if (pr.state !== "open") fail(1, "this change was closed");
  if (!pr.labels.includes("mcp") || pr.siteId !== site.id) fail(1, `this PR isn't an MCP change for ${site.id}`);
  if (pr.mergeable === false) fail(1, "the change conflicts with the live site; start a new change");
  if (pr.mergeable === null) fail(1, "GitHub is still checking whether the change can be merged; try again shortly");

  // 2. Only writable paths, and only commits the server signed.
  const outside = input.files.filter((f) => {
    const rel = siteRelative(site, f);
    return rel === null || !isWritable(site, rel);
  });
  if (outside.length) fail(2, `the change touches files that can't be published this way: ${outside.join(", ")}`);
  if (!input.commits.length) fail(2, "the change has no commits");
  for (const c of input.commits) {
    const v = verifyCommitSignature(signingSecret, c);
    if (!v.ok) fail(2, v.reason);
  }
  const unverified = input.commits.filter((c) => !c.verified).length;
  if (unverified) notes.push(`${unverified} commit(s) are not marked Verified by GitHub (not required).`);

  // 3. The site's own preview build passed for the current head.
  if (input.preview.state !== "ready" || input.preview.sha !== pr.headSha) {
    const why =
      input.preview.state === "failed"
        ? "the preview build failed"
        : input.preview.state === "ready"
          ? "the preview is for an older version of the change"
          : "the preview isn't ready yet";
    fail(3, why);
  }

  // 4. Every other check passed. Other Vercel projects (other sites) are informational: a
  // change to one site doesn't wait for, or fail on, another site's build.
  for (const c of input.checks) {
    if (c.ownVercel || /^vercel\b/i.test(c.name)) continue;
    if (c.state !== "success" && c.state !== "neutral" && c.state !== "skipped") fail(4, `check "${c.name}" is ${c.state}`);
  }

  // 5. Approval, when REQUIRE_APPROVAL is on.
  if (input.approval.required && !input.approval.approved) fail(5, "the change needs an approving review on GitHub first");

  return { ok: failures.length === 0, failures, notes };
}
