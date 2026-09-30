/**
 * Typed access to content/. Each JSON file is assigned to its interface here, so a content file
 * with the wrong shape fails `tsc` (and therefore `next build`).
 */
import type { SiteContent } from "./content-types";
import siteJson from "@/content/site.json";

export const site: SiteContent = siteJson;
