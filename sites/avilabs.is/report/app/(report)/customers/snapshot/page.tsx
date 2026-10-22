import { getViewer } from "@/lib/auth.ts";
import { loadAirlines } from "@/lib/report.ts";

export default async function SnapshotPage() {
  const { supabase } = await getViewer();
  const airlines = await loadAirlines(supabase);

  return (
    <section>
      <div className="container">
        <h2>Snapshots</h2>
        <div className="full responsiveTable">
          <table className="snapshotsTable">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Snapshot</th>
              </tr>
            </thead>
            <tbody>
              {airlines.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>{a.snapshot || "No snapshot available"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
