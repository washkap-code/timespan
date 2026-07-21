"use client";

/**
 * Minimal dependency-free SVG line chart for score/metric trends over time.
 * Deliberately hand-rolled rather than pulling in a charting library — the
 * data is small (last N runs) and this keeps the client bundle lean.
 */
export function TrendChart({
  series,
  height = 140,
}: {
  series: { label: string; color: string; values: number[] }[];
  height?: number;
}) {
  const width = 560;
  const padding = 8;
  const maxLen = Math.max(...series.map((s) => s.values.length), 1);
  const allValues = series.flatMap((s) => s.values);
  const min = Math.min(0, ...allValues);
  const max = Math.max(100, ...allValues);

  function points(values: number[]) {
    if (values.length === 0) return "";
    return values
      .map((v, i) => {
        const x = padding + (i / Math.max(maxLen - 1, 1)) * (width - padding * 2);
        const y = height - padding - ((v - min) / (max - min || 1)) * (height - padding * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" preserveAspectRatio="none">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#26263A" strokeWidth={1} />
        {series.map((s) => (
          <polyline
            key={s.label}
            points={points(s.values)}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
      <div className="mt-3 flex flex-wrap gap-4">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-xs text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
