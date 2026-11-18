"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, FileText } from "lucide-react";

type ReportAsset = { id: string; location: string; company?: string };

export default function ReportSelector({
  assets,
  selected = "",
  selectedIds = [],
  selectedCompany = "",
}: {
  assets: ReportAsset[];
  selected?: string;
  selectedIds?: string[];
  selectedCompany?: string;
}) {
  const [company, setCompany] = useState(selectedCompany);
  const [picked, setPicked] = useState<string[]>(
    selectedIds.length ? selectedIds : selected ? [selected] : [],
  );
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const box = useRef<HTMLDivElement>(null);

  // Built from the data, so legacy company names still appear
  const companyOptions = Array.from(
    new Set(assets.map((a) => a.company).filter(Boolean) as string[]),
  ).sort();

  const inCompany = company
    ? assets.filter((a) => a.company === company)
    : assets;

  const visible = inCompany.filter((a) =>
    (a.id + " " + a.location).toLowerCase().includes(search.toLowerCase()),
  );

  const companyHref = "/report?company=" + encodeURIComponent(company);

  // One asset keeps the single-asset report; several use ?assets=A,B,C
  const pickedHref =
    picked.length === 1
      ? "/report?asset=" + encodeURIComponent(picked[0])
      : "/report?assets=" + encodeURIComponent(picked.join(","));

  // Close on outside click or Escape
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function changeCompany(value: string) {
    setCompany(value);
    // keep only ticked assets that belong to the new company
    setPicked((p) =>
      p.filter(
        (id) => !value || assets.find((a) => a.id === id)?.company === value,
      ),
    );
  }

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const selectAllShown = () =>
    setPicked((p) => Array.from(new Set([...p, ...visible.map((a) => a.id)])));

  return (
    <div className="flex-row md:flex justify-around  ">
      <label className="report-selector mx-1 flex-1">
        Company assets report
        <select
          value={company}
          onChange={(e) => changeCompany(e.target.value)}
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

      <div className="report-selector asset-picker mx-1 flex-1" ref={box}>
        <span>Asset report</span>
        <button
          type="button"
          className="asset-picker-trigger my-3"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span>
            {picked.length
              ? `${picked.length} asset${picked.length > 1 ? "s" : ""} selected`
              : company
                ? `Select ${company} assets`
                : "Select assets"}
          </span>
          <ChevronDown size={16} />
        </button>

        {open && (
          <div className="asset-picker-panel">
            <input
              type="search"
              placeholder="Search asset or location"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <div className="asset-picker-actions">
              <button type="button" onClick={selectAllShown}>
                Select all{search ? " shown" : ""} ({visible.length})
              </button>
              <button type="button" onClick={() => setPicked([])}>
                Clear
              </button>
            </div>
            <div className="asset-picker-list">
              {visible.length ? (
                visible.map((a) => (
                  <label key={a.id} className="asset-option">
                    <input
                      type="checkbox"
                      checked={picked.includes(a.id)}
                      onChange={() => toggle(a.id)}
                    />
                    <span>
                      <b>{a.id}</b>
                      <small>{a.location}</small>
                    </span>
                  </label>
                ))
              ) : (
                <p className="asset-picker-empty">No matching assets.</p>
              )}
            </div>
          </div>
        )}

        {picked.length > 0 && (
          <a className="button primary" href={pickedHref}>
            <FileText size={18} />
            Open report ({picked.length})
          </a>
        )}
      </div>
    </div>
  );
}
