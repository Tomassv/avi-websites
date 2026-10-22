// A plain SVG bar chart, rendered on the server. Replaces the ApexCharts charts of the old PHP report.

import { fmt } from "@/lib/report.ts";

type RefLine = { value: number; label: string };

const W = 1200;
const H = 440;
const LEFT = 64;
const RIGHT = 16;
const TOP = 16;

const compact = new Intl.NumberFormat("en-US", { notation: "compact" });

/** The smallest 1/2/2.5/5 × 10ⁿ that is at least v, so the y axis gets round ticks. */
function niceCeil(v: number): number {
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((x) => x >= v) ?? 10 * p;
}

export function BarChart({ label, labels, values, format = (n) => fmt(n), refLines = [] }: {
  label: string;
  labels: string[];
  values: number[];
  format?: (n: number) => string;
  refLines?: RefLine[];
}) {
  const band = (W - LEFT - RIGHT) / Math.max(values.length, 1);
  const rotate = labels.some((l) => l.length * 8 > band - 8);
  const bottom = rotate ? 80 : 40;
  const plotH = H - TOP - bottom;
  const max = niceCeil(Math.max(1, ...values, ...refLines.map((r) => r.value)));
  const y = (v: number) => TOP + plotH - (Math.max(0, v) / max) * plotH;
  const ticks = [0, 1, 2, 3, 4, 5].map((i) => (max * i) / 5);

  return (
    <svg className="barChart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {ticks.map((t) => (
        <g key={t}>
          <line className="grid" x1={LEFT} x2={W - RIGHT} y1={y(t)} y2={y(t)} />
          <text x={LEFT - 8} y={y(t)} dy="0.35em" textAnchor="end">{compact.format(t)}</text>
        </g>
      ))}
      {values.map((v, i) => {
        const cx = LEFT + band * (i + 0.5);
        const ly = H - bottom + 20;
        return (
          <g key={i}>
            <rect x={cx - band * 0.3} y={y(v)} width={band * 0.6} height={y(0) - y(v)} rx={Math.min(5, band * 0.1)}>
              <title>{`${labels[i]}: ${format(v)}`}</title>
            </rect>
            <text x={cx} y={ly} textAnchor={rotate ? "end" : "middle"} transform={rotate ? `rotate(-45 ${cx} ${ly})` : undefined}>
              {labels[i]}
            </text>
          </g>
        );
      })}
      {refLines.map((r) => (
        <g key={r.label} className="refLine">
          <line x1={LEFT} x2={W - RIGHT} y1={y(r.value)} y2={y(r.value)} />
          <text x={W - RIGHT - 4} y={y(r.value) - 6} textAnchor="end">{r.label}</text>
        </g>
      ))}
    </svg>
  );
}
