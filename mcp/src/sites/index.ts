import type { SiteConfig } from "./types.ts";
import { curaAero } from "./cura-aero/config.ts";

/** Every site the server can edit, by id. */
export const SITES: Record<string, SiteConfig> = { [curaAero.id]: curaAero };

export function getSite(id: string): SiteConfig | undefined {
  return Object.hasOwn(SITES, id) ? SITES[id] : undefined;
}
