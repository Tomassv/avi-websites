/**
 * Per-site configuration. One module per site (src/sites/<id>/config.ts) describes what the
 * server may write, how the site's rules are reached, and where its Vercel previews appear.
 * Adding a site = a config, a rules adapter, and an entry in scripts/gen-rules.mjs.
 */

/** Field types used by update_text, chosen from the key name (SiteConfig.fieldRules). */
export type FieldKind = "rich" | "href" | "image" | "icon" | "hubspot";

/** The subset of the site's own lib/*.ts that the server calls (see scripts/gen-rules.mjs). */
export type SiteRules = {
  SLUG_RE: RegExp;
  RICH_CLASSES: readonly string[];
  safeHref(v: unknown): string | null;
  safeImageSrc(v: unknown): string | null;
  safeIconName(v: unknown): string | null;
  safeHubspotMeetingUrl(v: unknown): string | null;
  richToText(v: unknown): string;
  /** Throws the site's ArticleError with a `file: message` text. */
  parseArticle(source: string, slug: string, file: string): { draft: boolean; title: string; body: string };
  /** Throws the site's LandingError. `root` is a filesystem root laid out like the site. */
  parseLanding(source: string, slug: string, file: string, options: { root: string; skipReserved?: boolean }): { draft: boolean; seo: { title: string } };
  /** The error classes, so callers can tell validation failures from bugs. */
  isValidationError(e: unknown): boolean;
};

export type SiteConfig = {
  id: string;
  name: string;
  /** Repo path of the site, e.g. "sites/cura.aero". All other paths are relative to it. */
  root: string;
  productionUrl: string;
  vercel: {
    /** GitHub deployment environment Vercel uses for this project's previews. */
    previewEnvironment: string;
    /** Fallback: the commit status context Vercel posts for this project. */
    statusContext: string;
    /** Env var holding this project's "marketing-previews" bypass secret. */
    bypassSecretEnv: string;
  };
  /** Globs (site-relative) the server may write. `*` stays within a segment, `**` spans them. */
  writable: string[];
  /** Globs that are never written, even when a writable glob matches. They win. */
  protected: string[];
  /** Image folders by kind; `{slug}` is filled in for landing pages. */
  imageFolders: { landing?: string; news?: string };
  /** Route groups under app/ whose pages sit behind basic auth. */
  internalRouteGroups: string[];
  /**
   * Read-only JSON pointers. "*" applies to every file. A file entry with `allowOnly` makes every
   * pointer in that file read-only except the listed ones. Patterns: `*` = one segment, `**` = any.
   */
  readOnlyPointers: Record<string, string[] | { allowOnly: string[] }>;
  /** Field type by key name. Keys not listed are Rich text. */
  fieldRules: Record<string, FieldKind>;
  /** README sections that get_site_guide includes. */
  guide: { readme: string; sections: string[] };
  capabilities: {
    pages?: { dir: string };
    shared?: { dirs: string[]; files: string[] };
    landing?: { dir: string; urlPrefix: string; schema: string; catalogFile?: string };
    articles?: { dir: string; urlPrefix: string };
  };
  /** Site routes that aren't content files but should appear in list_pages, by content file. */
  pageRoutes: Record<string, string>;
  rules: SiteRules;
  /** Generated at build: git blob SHA of every site file the rules bundle contains. */
  rulesManifest: { site: string; files: Record<string, string> };
};
