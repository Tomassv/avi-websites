/**
 * Typed access to the shared content files. Each page loads its own file the same way,
 * assigning the JSON to its interface, so a content file with the wrong shape fails `tsc`
 * (and therefore `next build`).
 */
import type { EvidenceShared, SiteContent } from "./content-types";
import siteJson from "@/content/site.json";
import evidenceSharedJson from "@/content/shared/evidence-sources.json";

export const site: SiteContent = siteJson;
export const evidenceShared: EvidenceShared = evidenceSharedJson;
