import "@/styles/draft-banner.css";

/** Marks a draft that this build shows (local dev, Vercel previews); the live site never has drafts. */
export function DraftBanner() {
  return (
    <div className="draft-banner" role="status">
      Draft, not live
    </div>
  );
}
