import { conditions, priorities, maintenanceTypes } from "../../lib/ratings";
const conditionColors = [
  "#94a3b8",
  "#166534",
  "#22a152",
  "#eab308",
  "#f97316",
  "#dc2626",
];
const priorityColors = ["#94a3b8", "#dc2626", "#f97316", "#eab308", "#2563eb"];
const typeColors = [
  "#94a3b8",
  "#ff6b00",
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#eab308",
  "#db2777",
  "#4d4d4d",
];
function shade(color: string) {
  return (
    "#" +
    color
      .slice(1)
      .match(/../g)!
      .map((v) =>
        Math.round(parseInt(v, 16) * 0.62)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
function Pie({
  title,
  labels,
  colors,
  assets,
  field,
  fallback,
}: {
  title: string;
  labels: string[];
  colors: string[];
  assets: any[];
  field: string;
  fallback: string;
}) {
  const counts = labels.map(
      (l) => assets.filter((a) => (a[field] || fallback) === l).length,
    ),
    total = counts.reduce((a, b) => a + b, 0);
  let angle = -Math.PI / 2;
  const slices = counts
    .map((n, i) => {
      const start = angle;
      angle += total ? (n / total) * Math.PI * 2 : 0;
      const x1 = 120 + 104 * Math.cos(start),
        y1 = 120 + 104 * Math.sin(start),
        x2 = 120 + 104 * Math.cos(angle),
        y2 = 120 + 104 * Math.sin(angle);
      return {
        n,
        i,
        path: `M120 120 L${x1} ${y1} A104 104 0 ${n / total > 0.5 ? 1 : 0} 1 ${x2} ${y2} Z`,
      };
    })
    .filter((s) => s.n);
  return (
    <section className="portfolio-chart">
      <h3>{title}</h3>
      {total ? (
        <svg
          viewBox="0 0 240 220"
          role="img"
          aria-label={title + " for " + total + " assets"}
        >
          <ellipse
            cx="120"
            cy="184"
            rx="104"
            ry="20"
            fill="#000"
            opacity=".08"
          />
          {Array.from({ length: 20 }, (_, j) => 20 - j).map((depth) => (
            <g
              key={depth}
              transform={`translate(0 ${25 + depth}) scale(1 .7)`}
              aria-hidden="true"
            >
              {slices.map((s) =>
                s.n === total ? (
                  <circle
                    key={s.i}
                    cx="120"
                    cy="120"
                    r="104"
                    fill={shade(colors[s.i])}
                  />
                ) : (
                  <path key={s.i} d={s.path} fill={shade(colors[s.i])} />
                ),
              )}
            </g>
          ))}
          <g transform="translate(0 25) scale(1 .7)">
            {slices.map((s) =>
              s.n === total ? (
                <circle
                  key={s.i}
                  cx="120"
                  cy="120"
                  r="104"
                  fill={colors[s.i]}
                  stroke="white"
                  strokeWidth="1.5"
                >
                  <title>{`${labels[s.i]}: ${s.n} (100%)`}</title>
                </circle>
              ) : (
                <path
                  key={s.i}
                  d={s.path}
                  fill={colors[s.i]}
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                >
                  <title>{`${labels[s.i]}: ${s.n} (${Math.round((s.n / total) * 100)}%)`}</title>
                </path>
              ),
            )}
          </g>
        </svg>
      ) : (
        <p className="chart-empty">No assets to chart</p>
      )}
      <ul>
        {labels.map((label, i) => (
          <li key={label}>
            <i style={{ background: colors[i] }} />
            <span>{label}</span>
            <b>{counts[i]}</b>
            <small>{total ? Math.round((counts[i] / total) * 100) : 0}%</small>
          </li>
        ))}
      </ul>
    </section>
  );
}
export default function PortfolioCharts({ assets }: { assets: any[] }) {
  return (
    <div className="portfolio-charts">
      <Pie
        title="Condition ratings"
        labels={conditions}
        colors={conditionColors}
        assets={assets}
        field="condition"
        fallback="Not assessed"
      />
      <Pie
        title="Maintenance priority"
        labels={priorities}
        colors={priorityColors}
        assets={assets}
        field="priority"
        fallback="Not assigned"
      />
      <Pie
        title="Maintenance type"
        labels={maintenanceTypes}
        colors={typeColors}
        assets={assets}
        field="maintenanceType"
        fallback="Not specified"
      />
    </div>
  );
}
