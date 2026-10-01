import type { Snapshot } from "@/lib/api";

const W = 320;
const H = 140;
const PAD = 8;

// Daily distance from baseline, with the normal range as a reference line.
export function BaselineChart({ snapshot }: { snapshot: Snapshot }) {
  const scored = snapshot.series.filter((d) => d.score !== null);
  if (scored.length === 0) return null;

  const max = Math.max(snapshot.normal_range * 1.5, ...scored.map((d) => d.score!));
  const x = (i: number) => PAD + (i * (W - 2 * PAD)) / Math.max(1, scored.length - 1);
  const y = (score: number) => H - PAD - (score / max) * (H - 2 * PAD);
  const onset = snapshot.deviation?.onset;

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Distance from your baseline over time">
      <line
        x1={PAD}
        x2={W - PAD}
        y1={y(snapshot.normal_range)}
        y2={y(snapshot.normal_range)}
        stroke="var(--line)"
        strokeDasharray="4 4"
      />
      <text x={W - PAD} y={y(snapshot.normal_range) - 4} textAnchor="end" fontSize="9" fill="var(--muted)">
        Normal range
      </text>
      {scored.map((d, i) => (
        <circle
          key={d.day}
          cx={x(i)}
          cy={y(d.score!)}
          r={3}
          fill={onset && d.day >= onset ? "var(--accent)" : "var(--muted)"}
        />
      ))}
    </svg>
  );
}
