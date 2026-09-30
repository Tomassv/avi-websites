/**
 * Whether drafts (draft articles, draft landing pages, /landing-catalog) are part of this build.
 *
 * Only the live site hides them. Vercel preview deployments are production builds too
 * (NODE_ENV=production), so NODE_ENV can't tell them apart; VERCEL_ENV can. It is "production"
 * on the live deployment, "preview" on previews and unset locally.
 */
export function showDrafts(env: Record<string, string | undefined> = process.env): boolean {
  return env.VERCEL_ENV !== "production";
}
