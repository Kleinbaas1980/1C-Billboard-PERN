"use client";

import { useState } from "react";
import { FileText } from "lucide-react";

type ReportAsset = { id: string; location: string; company?: string };

export default function ReportSelector({
  assets,
  selected = "",
  selectedCompany = "",
}: {
  assets: ReportAsset[];
  selected?: string;
  selectedCompany?: string;
}) {
  const [company, setCompany] = useState(selectedCompany);

  // Built from the data, so legacy company names still appear
  const companyOptions = Array.from(
    new Set(assets.map((a) => a.company).filter(Boolean) as string[]),
  ).sort();

  const inCompany = company
    ? assets.filter((a) => a.company === company)
    : assets;

  const companyHref = "/report?company=" + encodeURIComponent(company);

  return (
    <div className="flex justify-around ">
      <label className="report-selector mx-1">
        Company assets report
        <select
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          aria-label="Choose a company"
          className="my-3"
        >
          <option value="">All companies</option>
          {companyOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>{" "}
        {company && (
          <a className="button primary" href={companyHref}>
            <FileText size={18} />
            Open {company} report ({inCompany.length})
          </a>
        )}
      </label>

      <label className="report-selector mx-1">
        Asset report
        <select
          className="my-3"
          aria-label="Choose an asset summary report"
          value={inCompany.some((a) => a.id === selected) ? selected : ""}
          onChange={(e) => {
            window.location.href = e.target.value
              ? "/report?asset=" + encodeURIComponent(e.target.value)
              : company
                ? companyHref
                : "/report";
          }}
        >
          <option value="">
            {company ? `All ${company} assets` : "All assets "}
          </option>
          {inCompany.map((a) => (
            <option key={a.id} value={a.id}>
              {a.id} — {a.location}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
