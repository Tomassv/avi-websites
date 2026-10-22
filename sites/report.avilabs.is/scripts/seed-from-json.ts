// Copies the old PHP report's JSON into Supabase.
//
//   npm run seed -- --dry-run   parse and print totals/corrections, write nothing
//   npm run seed                upsert airlines, monthly_usage and kpi_monthly; insert sales and
//                               forecast rows only if those tables are empty
//
// Airlines and monthly rows are upserted, so re-running right before cutover picks up the last
// edits made in edit.php. After cutover the app is the source of truth: don't run it again.
// Needs SUPABASE_SECRET_KEY in .env.local (it bypasses RLS; never deploy it).

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { toAirlineRow, toKpiRows, toMonthlyRows, totals, type AirlineRow, type Correction, type MonthlyUsageRow } from "../lib/import.ts";

const SOURCE = join(import.meta.dirname, "../../avilabs.is/report/r3okk32@3");
const dryRun = process.argv.includes("--dry-run");

// Display order used by the old customers-finance.php.
const ORDER = ["play", "flair", "transavia", "arajet", "airtransat", "dohop", "volotea", "airasia", "marabu", "brussels", "jet2", "jetstar"];

// Hardcoded in sales.php.
const SALES = [
  { customer: "United", stage: "Lead", interest: "Options/Hotels", potential_value: 800000 },
  { customer: "Southwest", stage: "Qualified Lead", interest: "Comms/Other Airlines/Hotels", potential_value: 1000000 },
  { customer: "Delta", stage: "Demo", interest: "Options", potential_value: 500000 },
  { customer: "Finnair", stage: "Negotiation", interest: "Hotels/Options", potential_value: 80000 },
  { customer: "Marabu", stage: "Closed-Won", interest: "Comms", potential_value: 10000 },
].map((s, sort) => ({ ...s, currency: "USD", next_steps: "", sort }));

// Hardcoded in airlineRevenue.html (chart series in $k per month for 2025, plus the detail cards).
const FORECAST = [
  { customer: "WestJet", category: "fixed", probability: 100, start_month: "2025-02-01", end_month: "2025-12-01", monthly_amount: 70000, start_note: "Feb 25", status: "Active" },
  { customer: "Icelandair", category: "contracted", probability: 90, start_month: "2025-01-01", end_month: "2025-12-01", monthly_amount: 50000, start_note: "Jul 25 | On time", status: "Finalizing agreement" },
  { customer: "Copa", category: "contracted", probability: 90, start_month: "2025-07-01", end_month: "2025-12-01", monthly_amount: 20000, start_note: "Jul 25 | 1 month late", status: "In review" },
  { customer: "United", category: "forecasted", probability: 80, start_month: "2025-03-01", end_month: "2025-12-01", monthly_amount: 120000, start_note: "March 25 | On time", status: "Slight delay in contracting" },
].map((d, sort) => ({ ...d, currency: "USD", sort }));

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(join(SOURCE, file), "utf8"));
}

const ids = readdirSync(SOURCE)
  .filter((f) => f.endsWith(".json") && !f.endsWith("_monthly.json") && f !== "kpi.json")
  .map((f) => f.slice(0, -".json".length))
  .sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99) || a.localeCompare(b));

const airlines: AirlineRow[] = [];
const monthly: MonthlyUsageRow[] = [];
const corrections: Correction[] = [];
const summary: Record<string, unknown>[] = [];

for (const [sort, id] of ids.entries()) {
  airlines.push(toAirlineRow(id, readJson(`${id}.json`), sort));
  const { rows, corrections: c } = toMonthlyRows(id, readJson(`${id}_monthly.json`));
  monthly.push(...rows);
  corrections.push(...c);
  const t = totals(rows);
  summary.push({ airline: id, months: rows.length, ...t, credits_available: t.credits_added - t.credits_used });
}
const kpi = toKpiRows(readJson("kpi.json"));

console.log(`Source: ${SOURCE}`);
console.log(`${airlines.length} airlines, ${monthly.length} monthly rows, ${kpi.length} KPI rows\n`);
console.log("Totals per airline (compare with airline.php summary tiles; revenue differs where corrected below):");
console.table(summary);
if (corrections.length) {
  console.log(`\n${corrections.length} values were not plain numbers. "old page" is what the PHP pages computed:`);
  console.table(corrections.map((c) => ({
    airline: c.airline_id, month: c.month, field: c.field, raw: c.raw, imported: c.value,
    "old page": c.oldPageValue, check: c.ambiguous ? "AMBIGUOUS" : "",
  })));
}

if (dryRun) {
  console.log("\nDry run: nothing written.");
  process.exit(0);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.local");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function check<T>(label: string, p: PromiseLike<{ error: unknown; data?: T }>) {
  const { error, data } = await p;
  if (error) throw new Error(`${label}: ${JSON.stringify(error)}`);
  return data;
}

await check("airlines", db.from("airlines").upsert(airlines, { onConflict: "id" }));
await check("monthly_usage", db.from("monthly_usage").upsert(monthly, { onConflict: "airline_id,month" }));
await check("kpi_monthly", db.from("kpi_monthly").upsert(kpi, { onConflict: "airline_id,month" }));

for (const [table, rows] of [["sales_opportunities", SALES], ["forecast_deals", FORECAST]] as const) {
  const { count, error } = await db.from(table).select("*", { count: "exact", head: true });
  if (error) throw new Error(`${table}: ${JSON.stringify(error)}`);
  if (count) {
    console.log(`${table}: already has ${count} rows, left as is.`);
  } else {
    await check(table, db.from(table).insert(rows as readonly object[] as object[]));
    console.log(`${table}: inserted ${rows.length} rows.`);
  }
}

console.log("\nDone.");
