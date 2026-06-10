// Tiny dependency-free SVG sparkline of yearly peak river discharge.
export default function Sparkline({ data, highlightYear, width = 300, height = 56 }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map((d) => d.max));
  const n = data.length;
  const x = (i) => (n === 1 ? width / 2 : (i / (n - 1)) * (width - 6) + 3);
  const y = (v) => height - 4 - (v / (max || 1)) * (height - 10);
  const path = data
    .map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.max).toFixed(1)}`)
    .join(" ");
  const hiIndex = data.findIndex((d) => d.year === highlightYear);
  const hi = hiIndex >= 0 ? data[hiIndex] : null;
  return (
    <svg
      className="spark"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Yearly peak river discharge since 1984"
    >
      <path d={path} fill="none" stroke="#2563eb" strokeWidth="1.5" />
      {hi && <circle cx={x(hiIndex)} cy={y(hi.max)} r="3.5" fill="#dc2626" />}
    </svg>
  );
}
