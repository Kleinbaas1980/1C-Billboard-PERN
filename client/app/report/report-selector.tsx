"use client";
export default function ReportSelector({
  assets,
  selected = "",
}: {
  assets: { id: string; location: string }[];
  selected?: string;
}) {
  return (
    <label className="report-selector no-print">
      Summary report
      <select
        aria-label="Choose an asset summary report"
        value={selected}
        onChange={(e) => {
          window.location.href = e.target.value
            ? "/report?asset=" + encodeURIComponent(e.target.value)
            : "/report";
        }}
      >
        <option value="">All assets — portfolio overview</option>
        {assets.map((a) => (
          <option key={a.id} value={a.id}>
            {a.id} — {a.location}
          </option>
        ))}
      </select>
    </label>
  );
}
