import { requireEditor } from "@/lib/auth.ts";
import { MONTHS } from "@/lib/import.ts";
import { humanize, INFO_SECTIONS, loadAirlines, loadUsage, USAGE_FIELDS } from "@/lib/report.ts";
import { EditForm } from "@/components/EditForm.tsx";
import { ParamSelect } from "@/components/ParamSelect.tsx";
import { saveCustomer } from "./actions.ts";

export default async function EditPage({ searchParams }: { searchParams: Promise<{ airline?: string; year?: string }> }) {
  const params = await searchParams;
  const { supabase } = await requireEditor();
  const airlines = await loadAirlines(supabase);
  const airline = airlines.find((a) => a.id === params.airline) ?? airlines[0];
  if (!airline) {
    return <section><div className="container"><p>No airlines yet.</p></div></section>;
  }

  const usage = await loadUsage(supabase, airline.id);
  const currentYear = String(new Date().getFullYear());
  const years = [...new Set([currentYear, ...usage.map((u) => u.month.slice(0, 4))])].sort().reverse();
  const year = years.find((y) => y === params.year) ?? currentYear;
  const byMonth = new Map(usage.map((u) => [u.month, u]));

  return (
    <section>
      <div className="container">
        <EditForm
          key={`${airline.id}-${year}`}
          action={saveCustomer.bind(null, airline.id, year)}
          toolbar={
            <>
              <ParamSelect
                name="airline"
                label="Airline"
                value={airline.id}
                options={airlines.map((a) => ({ value: a.id, label: a.name }))}
                params={{ year }}
              />
              <ParamSelect
                name="year"
                label="Year"
                value={year}
                options={years.map((y) => ({ value: y, label: y }))}
                params={{ airline: airline.id }}
              />
            </>
          }
        >
          <h2>Edit {airline.name}</h2>

          <h3>Monthly Data {year}</h3>
          <div className="full responsiveTable">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  {USAGE_FIELDS.map((f) => <th key={f}>{humanize(f)}</th>)}
                </tr>
              </thead>
              <tbody>
                {MONTHS.map((monthName, i) => {
                  const month = `${year}-${String(i + 1).padStart(2, "0")}-01`;
                  const row = byMonth.get(month);
                  return (
                    <tr key={month}>
                      <td>{monthName}</td>
                      {USAGE_FIELDS.map((f) => (
                        <td key={f}>
                          <input
                            name={`month.${month}.${f}`}
                            defaultValue={row ? String(row[f]) : ""}
                            inputMode="decimal"
                            aria-label={`${monthName} ${humanize(f)}`}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <h3 className="h3Editor">Snapshot</h3>
          <textarea name="snapshot" rows={4} defaultValue={airline.snapshot} aria-label="Snapshot" />

          {INFO_SECTIONS.map((section) => (
            <div key={section}>
              <h3 className="h3Editor">{humanize(section)}</h3>
              <table className="infoEdit">
                <tbody>
                  {Object.entries(airline[section]).map(([key, value]) => (
                    <tr key={key}>
                      <th><label htmlFor={`${section}.${key}`}>{humanize(key)}</label></th>
                      <td><input id={`${section}.${key}`} name={`${section}.${key}`} defaultValue={value} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </EditForm>
      </div>
    </section>
  );
}
