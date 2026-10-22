import { getViewer } from "@/lib/auth.ts";
import { YesNo } from "@/components/YesNo.tsx";

const FEATURES = [
  ["comms", "Comms"],
  ["re_accom", "Re-accom"],
  ["refunds", "Refunds"],
  ["vouchers", "Vouchers"],
  ["hotels", "Hotels"],
  ["other_airlines", "Other Airlines"],
] as const;

export default async function FeaturesPage() {
  const { supabase } = await getViewer();
  const { data: airlines, error } = await supabase
    .from("airlines")
    .select("id, name, feature_info")
    .eq("active", true)
    .order("sort")
    .returns<{ id: string; name: string; feature_info: Record<string, string> }[]>();
  if (error) throw new Error(error.message);

  return (
    <section>
      <div className="container">
        <h2>Features</h2>
        <div className="full responsiveTable">
          <table className="featuresTable">
            <thead>
              <tr>
                <th>Customer</th>
                {FEATURES.map(([key, label]) => <th key={key}>{label}</th>)}
              </tr>
            </thead>
            <tbody>
              {airlines.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  {FEATURES.map(([key]) => <td key={key}><YesNo value={a.feature_info[key]} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
