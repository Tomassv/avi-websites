"use server";

import { revalidatePath } from "next/cache";
import { requireEditor } from "@/lib/auth.ts";
import { MONTHS } from "@/lib/import.ts";
import { parseNumber } from "@/lib/parse-number.ts";
import { humanize, INFO_SECTIONS, USAGE_FIELDS, type Info } from "@/lib/report.ts";

export type SaveState = { saved?: boolean; errors?: string[] };

const INTEGER_FIELDS: readonly string[] = ["credits_used", "credits_added"];

/**
 * Saves one airline's info sections, snapshot and the monthly rows of one year. Only keys that
 * already exist in a section are written; an empty month is stored only if it already had a row.
 */
export async function saveCustomer(airlineId: string, year: string, _prev: SaveState, form: FormData): Promise<SaveState> {
  const { supabase } = await requireEditor();
  if (!/^\d{4}$/.test(year)) return { errors: ["Invalid year."] };

  const { data: airline, error } = await supabase
    .from("airlines")
    .select(INFO_SECTIONS.join(", "))
    .eq("id", airlineId)
    .maybeSingle<Record<(typeof INFO_SECTIONS)[number], Info>>();
  if (error) return { errors: [error.message] };
  if (!airline) return { errors: ["Airline not found."] };

  const errors: string[] = [];
  const update: Record<string, unknown> = {
    snapshot: String(form.get("snapshot") ?? "").replace(/\r\n/g, "\n").trim(),
  };
  for (const section of INFO_SECTIONS) {
    update[section] = Object.fromEntries(
      Object.entries(airline[section]).map(([key, old]) => [key, String(form.get(`${section}.${key}`) ?? old).trim()]),
    );
  }
  const mainInfo = update.main_info as Info;
  if ("name" in mainInfo) {
    if (mainInfo.name) update.name = mainInfo.name;
    else errors.push("Main info name can't be empty.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("monthly_usage")
    .select("month")
    .eq("airline_id", airlineId)
    .gte("month", `${year}-01-01`)
    .lte("month", `${year}-12-01`)
    .returns<{ month: string }[]>();
  if (existingError) return { errors: [existingError.message] };
  const hasRow = new Set(existing.map((r) => r.month));

  const rows: Record<string, string | number>[] = [];
  MONTHS.forEach((monthName, i) => {
    const month = `${year}-${String(i + 1).padStart(2, "0")}-01`;
    const row: Record<string, string | number> = { airline_id: airlineId, month };
    let nonZero = false;
    for (const field of USAGE_FIELDS) {
      const raw = form.get(`month.${month}.${field}`);
      if (raw === null) return;
      try {
        const { value } = parseNumber(raw);
        if (INTEGER_FIELDS.includes(field) && !Number.isInteger(value)) throw new Error("must be a whole number");
        row[field] = value;
        nonZero ||= value !== 0;
      } catch (e) {
        errors.push(`${monthName}, ${humanize(field)}: ${(e as Error).message}`);
      }
    }
    if (nonZero || hasRow.has(month)) rows.push(row);
  });

  if (errors.length) return { errors };

  const { error: airlineError } = await supabase.from("airlines").update(update).eq("id", airlineId);
  if (airlineError) return { errors: [airlineError.message] };
  if (rows.length) {
    const { error: usageError } = await supabase.from("monthly_usage").upsert(rows, { onConflict: "airline_id,month" });
    if (usageError) return { errors: [usageError.message] };
  }

  revalidatePath("/customers", "layout");
  return { saved: true };
}
