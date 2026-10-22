import { getViewer } from "@/lib/auth.ts";
import { MONTHS } from "@/lib/import.ts";
import { currencySymbol, fmt, humanize, loadAirlines, loadUsage, shortMonth, sumUsage, type Info } from "@/lib/report.ts";
import { BarChart } from "@/components/BarChart.tsx";
import { ParamSelect } from "@/components/ParamSelect.tsx";
import { YesNo } from "@/components/YesNo.tsx";

function InfoTable({ info }: { info: Info }) {
  return (
    <table>
      <tbody>
        {Object.entries(info).filter(([key]) => key !== "name").map(([key, value]) => (
          <tr key={key}>
            <th>{humanize(key)}</th>
            <td><YesNo value={value} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function AirlinePage({ searchParams }: { searchParams: Promise<{ airline?: string }> }) {
  const { airline: wanted } = await searchParams;
  const { supabase } = await getViewer();
  const airlines = await loadAirlines(supabase);
  const airline = airlines.find((a) => a.id === wanted) ?? airlines[0];
  if (!airline) {
    return <section><div className="container"><p>No airlines yet.</p></div></section>;
  }

  const usage = await loadUsage(supabase, airline.id);
  const totals = sumUsage(usage);
  const symbol = currencySymbol(airline.commercial_info.currency);
  const labels = usage.map((u) => shortMonth(u.month));

  return (
    <section className="airlinePage">
      <div className="container">
        <div className="flex ac sbw">
          <div className="col50"><h2>{airline.name}</h2></div>
          <div className="col50 flex ac jce">
            <ParamSelect
              name="airline"
              label="Airline"
              value={airline.id}
              options={airlines.map((a) => ({ value: a.id, label: a.name }))}
              params={{}}
            />
          </div>
        </div>

        <div className="insights">
          <p>Total Credits Used <span>{fmt(totals.credits_used)}</span></p>
          <p>Total Credits Added <span>{fmt(totals.credits_added)}</span></p>
          <p>Total Credits Available <span>{fmt(totals.credits_added - totals.credits_used)}</span></p>
          <p>Total Revenue <span>{symbol}{fmt(totals.revenue)}</span></p>
        </div>

        <div className="flex gap80">
          <div className="col50">
            <h2>Credits Used</h2>
            <BarChart label={`Credits used per month, ${airline.name}`} labels={labels} values={usage.map((u) => u.credits_used)} />
          </div>
          <div className="col50">
            <h2>Revenue</h2>
            <BarChart
              label={`Revenue per month, ${airline.name}`}
              labels={labels}
              values={usage.map((u) => u.revenue)}
              format={(n) => `${symbol}${fmt(n)}`}
            />
          </div>
        </div>

        <div className="flex gap80">
          <div className="col50">
            <h2>Main Info</h2>
            <InfoTable info={airline.main_info} />
          </div>
          <div className="col50">
            <h2>Feature Info</h2>
            <InfoTable info={airline.feature_info} />
          </div>
        </div>
        <div className="divider" />
        <div className="flex gap80">
          <div className="col50">
            <h2>Commercial Info</h2>
            <InfoTable info={airline.commercial_info} />
          </div>
          <div className="col50">
            <h2>Integration Info</h2>
            <InfoTable info={airline.integration_info} />
          </div>
        </div>
        <div className="divider" />

        <h2>Monthly Data</h2>
        <div className="full responsiveTable">
          <table>
            <thead>
              <tr>
                <th>Year</th>
                <th>Month</th>
                <th>Credits Used</th>
                <th>Credits Added</th>
                <th>Revenue</th>
                <th>Twilio</th>
                <th>Hotels</th>
              </tr>
            </thead>
            <tbody>
              {usage.map((u) => (
                <tr key={u.month}>
                  <td>{u.month.slice(0, 4)}</td>
                  <td>{MONTHS[Number(u.month.slice(5, 7)) - 1]}</td>
                  <td>{fmt(u.credits_used)}</td>
                  <td>{fmt(u.credits_added)}</td>
                  <td>{symbol}{fmt(u.revenue)}</td>
                  <td>{symbol}{fmt(u.twilio)}</td>
                  <td>{symbol}{fmt(u.hotels)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
