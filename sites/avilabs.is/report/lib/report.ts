// Queries and formatting shared by the Customers pages.

import type { createClient } from "./supabase/server.ts";

type Client = Awaited<ReturnType<typeof createClient>>;

export type Info = Record<string, string>;

export const INFO_SECTIONS = ["main_info", "commercial_info", "integration_info", "feature_info"] as const;

export type Airline = {
  id: string;
  name: string;
  snapshot: string;
  main_info: Info;
  commercial_info: Info;
  integration_info: Info;
  feature_info: Info;
};

export type Usage = {
  airline_id: string;
  month: string;
  credits_used: number;
  credits_added: number;
  revenue: number;
  twilio: number;
  hotels: number;
};

export const USAGE_FIELDS = ["credits_used", "credits_added", "revenue", "twilio", "hotels"] as const;

/** Active airlines in display order. */
export async function loadAirlines(supabase: Client): Promise<Airline[]> {
  const { data, error } = await supabase
    .from("airlines")
    .select("id, name, snapshot, main_info, commercial_info, integration_info, feature_info")
    .eq("active", true)
    .order("sort")
    .returns<Airline[]>();
  if (error) throw new Error(error.message);
  return data;
}

/** Monthly rows in date order, for one airline or all. Paged because PostgREST caps responses at 1000 rows. */
export async function loadUsage(supabase: Client, airlineId?: string): Promise<Usage[]> {
  const PAGE = 1000;
  const rows: Usage[] = [];
  for (let from = 0; ; from += PAGE) {
    let query = supabase
      .from("monthly_usage")
      .select("airline_id, month, credits_used, credits_added, revenue, twilio, hotels")
      .order("month")
      .order("airline_id")
      .range(from, from + PAGE - 1);
    if (airlineId) query = query.eq("airline_id", airlineId);
    const { data, error } = await query.returns<Usage[]>();
    if (error) throw new Error(error.message);
    // numeric columns can arrive as strings; make sure everything is a number.
    for (const r of data) rows.push({ ...r, ...Object.fromEntries(USAGE_FIELDS.map((f) => [f, Number(r[f])])) });
    if (data.length < PAGE) return rows;
  }
}

export type Totals = Record<(typeof USAGE_FIELDS)[number], number>;

export function sumUsage(rows: Usage[]): Totals {
  const t: Totals = { credits_used: 0, credits_added: 0, revenue: 0, twilio: 0, hotels: 0 };
  for (const r of rows) for (const f of USAGE_FIELDS) t[f] += r[f];
  return t;
}

export function fmt(n: number, maxDigits = 0): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: maxDigits });
}

export function currencySymbol(currency: string | undefined): string {
  return currency === "EUR" ? "€" : currency === "USD" ? "$" : "";
}

/** "2023-08-01" → "Aug '23". */
export function shortMonth(month: string): string {
  const date = new Date(`${month}T00:00:00Z`);
  return date.toLocaleString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }).replace(" ", " '");
}

const ACRONYMS = new Set(["pss", "dcs", "sso", "pnr", "poc", "chkd"]);

/** "split_pnr" → "split PNR" (the table CSS capitalizes the first letters). */
export function humanize(key: string): string {
  return key.split("_").map((w) => (ACRONYMS.has(w) ? w.toUpperCase() : w)).join(" ");
}
