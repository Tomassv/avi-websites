import { getViewer } from "@/lib/auth.ts";
import { MONTHS } from "@/lib/import.ts";
import { currencySymbol, fmt, loadAirlines, loadUsage, sumUsage, type Usage } from "@/lib/report.ts";
import { BarChart } from "@/components/BarChart.tsx";
import { ParamSelect } from "@/components/ParamSelect.tsx";

// Reference lines from the old finance page's monthly revenue chart.
const BONUS_LINES = [
  { value: 250000, label: "Bonus Program Starts" },
  { value: 360000, label: "13th months salary" },
  { value: 455000, label: "14th months salary" },
];

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ year?: string; month?: string }> }) {
  const params = await searchParams;
  const { supabase } = await getViewer();
  const [airlines, usage] = await Promise.all([loadAirlines(supabase), loadUsage(supabase)]);

  const years = [...new Set(usage.map((u) => u.month.slice(0, 4)))].sort();
  const currentYear = String(new Date().getFullYear());
  const year = years.find((y) => y === params.year) ?? (years.includes(currentYear) ? currentYear : years.at(-1) ?? currentYear);
  const monthIndex = MONTHS.findIndex((m) => m === params.month);
  const month = monthIndex >= 0 ? MONTHS[monthIndex] : "";
  const period = month ? `${month} ${year}` : year;

  const inYear = (u: Usage) => u.month.startsWith(`${year}-`);
  const inPeriod = (u: Usage) => inYear(u) && (monthIndex < 0 || Number(u.month.slice(5, 7)) === monthIndex + 1);

  const rows = airlines.map((a) => {
    const own = usage.filter((u) => u.airline_id === a.id);
    const allTime = sumUsage(own);
    return {
      airline: a,
      symbol: currencySymbol(a.commercial_info.currency),
      period: sumUsage(own.filter(inPeriod)),
      available: allTime.credits_added - allTime.credits_used,
    };
  });
  const total = sumUsage(usage.filter((u) => airlines.some((a) => a.id === u.airline_id) && inPeriod(u)));

  const perMonth = MONTHS.map((_, i) =>
    sumUsage(usage.filter((u) => inYear(u) && Number(u.month.slice(5, 7)) === i + 1 && airlines.some((a) => a.id === u.airline_id))).revenue,
  );

  const keep = { year, ...(month && { month }) };

  return (
    <>
      <section>
        <div className="container">
          <div className="flex ac sbw">
            <div className="col50"><h2>Finance</h2></div>
            <div className="col50 flex ac jce gap24">
              <ParamSelect name="year" label="Year" value={year} options={years.map((y) => ({ value: y, label: y }))} params={keep} />
              <ParamSelect
                name="month"
                label="Month"
                value={month}
                options={[{ value: "", label: "All months" }, ...MONTHS.map((m) => ({ value: m, label: m }))]}
                params={keep}
              />
            </div>
          </div>
          <div className="full responsiveTable">
            <table className="financeTable">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Revenue</th>
                  <th>Credits Used</th>
                  <th>Credits Added</th>
                  <th>Credits Available</th>
                  <th>Payment Method</th>
                  <th>Price&nbsp;per&nbsp;credit</th>
                  <th>Fixed Price</th>
                  <th>Currency</th>
                  <th>Twilio</th>
                  <th>Hotels</th>
                </tr>
              </thead>
              <tbody>
                <tr className="totalRow">
                  <td>Total</td>
                  <td>{fmt(total.revenue)}</td>
                  <td>{fmt(total.credits_used)}</td>
                  <td>{fmt(total.credits_added)}</td>
                  <td />
                  <td />
                  <td />
                  <td />
                  <td />
                  <td>{fmt(total.twilio)}</td>
                  <td>{fmt(total.hotels)}</td>
                </tr>
                {rows.map(({ airline: a, symbol, period: p, available }) => (
                  <tr key={a.id}>
                    <td>{a.name}</td>
                    <td>{symbol}{fmt(p.revenue)}</td>
                    <td>{fmt(p.credits_used)}</td>
                    <td>{fmt(p.credits_added)}</td>
                    <td>{fmt(available)}</td>
                    <td>{a.commercial_info.payment_method || "N/A"}</td>
                    <td>{symbol}{fmt(Number(a.commercial_info.price_per_credit) || 0, 2)}</td>
                    <td>{symbol}{fmt(Number(a.commercial_info.payment_plan) || 0, 2)}</td>
                    <td>{a.commercial_info.currency || "N/A"}</td>
                    <td>{symbol}{fmt(p.twilio)}</td>
                    <td>{symbol}{fmt(p.hotels)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="divider" />

      <section>
        <div className="container">
          <h2>Revenue per Customer in {period}</h2>
          <BarChart
            label={`Revenue per customer in ${period}`}
            labels={rows.map((r) => r.airline.name)}
            values={rows.map((r) => r.period.revenue)}
          />
        </div>
      </section>

      <div className="divider" />

      <section>
        <div className="container">
          <h2>Revenue per Month in {year}</h2>
          <BarChart label={`Revenue per month in ${year}`} labels={[...MONTHS]} values={perMonth} refLines={BONUS_LINES} />
        </div>
      </section>
    </>
  );
}
