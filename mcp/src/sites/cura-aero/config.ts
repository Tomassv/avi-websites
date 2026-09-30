import manifest from "../../generated/cura-aero-rules.manifest.json" with { type: "json" };
import type { SiteConfig } from "../types.ts";
import { curaRules } from "./rules.ts";

export const curaAero: SiteConfig = {
  id: "cura.aero",
  name: "Cura",
  root: "sites/cura.aero",
  productionUrl: "https://cura.aero",
  vercel: {
    // Checked on the first test PR (MCP-PLAN.md §15.2); Vercel names these after the project.
    previewEnvironment: "Preview – cura-aero",
    statusContext: "Vercel – cura-aero",
    bypassSecretEnv: "PREVIEW_BYPASS_SECRET_CURA_AERO",
  },
  writable: ["content/**/*.json", "content/**/*.md", "public/images/landing/*/**", "public/images/news/**"],
  protected: ["content/landing.schema.json"],
  imageFolders: { landing: "public/images/landing/{slug}", news: "public/images/news" },
  internalRouteGroups: ["(docs)", "(deck)"],
  readOnlyPointers: {
    "content/site.json": { allowOnly: ["/footer/copyright", "/footer/address", "/footer/parent/label"] },
    "*": ["**/jsonLd/**", "**/canonical", "**/openGraph/url", "/gaId", "/url"],
  },
  fieldRules: { href: "href", src: "image", photos: "image", icon: "icon", hubspotMeetingUrl: "hubspot" },
  guide: { readme: "README.md", sections: ["Editing content", "Adding an article", "Drafts", "Landing pages"] },
  capabilities: {
    pages: { dir: "content/pages" },
    shared: { dirs: ["content/shared"], files: ["content/site.json"] },
    landing: {
      dir: "content/landing",
      urlPrefix: "/",
      schema: "content/landing.schema.json",
      catalogFile: "content/landing-catalog.json",
    },
    articles: { dir: "content/articles", urlPrefix: "/news/" },
  },
  pageRoutes: { "content/pages/home.json": "/", "content/pages/news.json": "/news", "content/landing-catalog.json": "/landing-catalog" },
  rules: curaRules,
  rulesManifest: manifest,
};
