// Converts the old report JSON files (sites/avilabs.is/report/r3okk32@3/) into table rows.
// Pure functions; scripts/seed-from-json.ts does the file reading and the upserts.

import { parseNumber } from "./parse-number.ts";

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

const SECTIONS = ["main_info", "commercial_info", "integration_info", "feature_info"] as const;

export type AirlineRow = {
  id: string;
  name: string;
  sort: number;
  snapshot: string;
  main_info: Record<string, string>;
  commercial_info: Record<string, string>;
  integration_info: Record<string, string>;
  feature_info: Record<string, string>;
};

export type MonthlyUsageRow = {
  airline_id: string;
  month: string;
  credits_used: number;
  credits_added: number;
  revenue: number;
  twilio: number;
  hotels: number;
};

export type KpiRow = {
  airline_id: string;
  month: string;
  core: unknown;
  financial: unknown;
  product: unknown;
  customer_success: unknown;
};

/** A value that wasn't a plain number in the source, for the seed script to print. */
export type Correction = {
  airline_id: string;
  month: string;
  field: string;
  raw: string;
  value: number;
  oldPageValue: number;
  ambiguous: boolean;
};

/** "2023", "August" → "2023-08-01". */
export function monthDate(year: string, monthName: string): string {
  const index = MONTHS.indexOf(monthName as (typeof MONTHS)[number]);
  if (index < 0) throw new Error(`Unknown month ${JSON.stringify(monthName)}`);
  if (!/^\d{4}$/.test(year)) throw new Error(`Bad year ${JSON.stringify(year)}`);
  return `${year}-${String(index + 1).padStart(2, "0")}-01`;
}

function stringSection(value: unknown, where: string): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${where} is not an object`);
  }
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, v == null ? "" : String(v)]));
}

export function toAirlineRow(id: string, json: unknown, sort: number): AirlineRow {
  const data = json as Record<string, unknown>;
  const sections = Object.fromEntries(
    SECTIONS.map((s) => [s, stringSection(data[s], `${id}.json ${s}`)]),
  ) as Pick<AirlineRow, (typeof SECTIONS)[number]>;
  const name = sections.main_info.name?.trim();
  if (!name) throw new Error(`${id}.json has no main_info.name`);
  return {
    id,
    name,
    sort,
    // The PHP editor saved textareas with CRLF line endings.
    snapshot: String(data.snapshot ?? "").replace(/\r\n/g, "\n"),
    ...sections,
  };
}

const INTEGER_FIELDS = ["credits_used", "credits_added"] as const;
const DECIMAL_FIELDS = ["revenue", "twilio", "hotels"] as const;

export function toMonthlyRows(
  airlineId: string,
  json: unknown,
): { rows: MonthlyUsageRow[]; corrections: Correction[] } {
  const rows: MonthlyUsageRow[] = [];
  const corrections: Correction[] = [];
  for (const [year, months] of Object.entries(json as Record<string, Record<string, Record<string, unknown>>>)) {
    for (const [monthName, data] of Object.entries(months)) {
      const month = monthDate(year, monthName);
      const row = { airline_id: airlineId, month } as MonthlyUsageRow;
      for (const field of [...INTEGER_FIELDS, ...DECIMAL_FIELDS]) {
        const raw = data[field];
        let parsed;
        try {
          parsed = parseNumber(raw);
        } catch (error) {
          throw new Error(`${airlineId} ${month} ${field}: ${(error as Error).message}`);
        }
        if ((INTEGER_FIELDS as readonly string[]).includes(field) && !Number.isInteger(parsed.value)) {
          throw new Error(`${airlineId} ${month} ${field}: expected a whole number, got ${JSON.stringify(raw)}`);
        }
        row[field] = parsed.value;
        if (parsed.normalized && String(raw ?? "").trim() !== String(parsed.value)) {
          corrections.push({
            airline_id: airlineId,
            month,
            field,
            raw: String(raw),
            value: parsed.value,
            // What the old pages showed: parseInt for credits and revenue, parseFloat otherwise.
            oldPageValue: ((DECIMAL_FIELDS as readonly string[]).includes(field) && field !== "revenue"
              ? parseFloat(String(raw))
              : parseInt(String(raw), 10)) || 0,
            ambiguous: parsed.ambiguous,
          });
        }
      }
      rows.push(row);
    }
  }
  rows.sort((a, b) => a.month.localeCompare(b.month));
  return { rows, corrections };
}

/** kpi.json is { monthlyData: { [year]: { [month]: { [airline]: { coreMetrics, ... } } } } }. */
export function toKpiRows(json: unknown): KpiRow[] {
  const monthly = (json as { monthlyData?: Record<string, Record<string, Record<string, Record<string, unknown>>>> })
    .monthlyData;
  if (!monthly) throw new Error("kpi.json has no monthlyData");
  const rows: KpiRow[] = [];
  for (const [year, months] of Object.entries(monthly)) {
    for (const [monthName, airlines] of Object.entries(months)) {
      for (const [airlineId, m] of Object.entries(airlines)) {
        rows.push({
          airline_id: airlineId,
          month: monthDate(year, monthName),
          core: m.coreMetrics ?? {},
          financial: m.financialMetrics ?? {},
          product: m.productPerformanceMetrics ?? {},
          customer_success: m.customerSuccessMetrics ?? {},
        });
      }
    }
  }
  return rows;
}

export type Totals = { credits_used: number; credits_added: number; revenue: number };

export function totals(rows: MonthlyUsageRow[]): Totals {
  return rows.reduce(
    (t, r) => ({
      credits_used: t.credits_used + r.credits_used,
      credits_added: t.credits_added + r.credits_added,
      revenue: t.revenue + r.revenue,
    }),
    { credits_used: 0, credits_added: 0, revenue: 0 },
  );
}
