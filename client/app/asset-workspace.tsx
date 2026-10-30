"use client";
import { downloadRegister } from "@/services/assets";
import { apiRequest } from "@/services/http";
import { useEffect, useRef, useState } from "react";
import {
  Plus,
  MapPin,
  CalendarDays,
  X,
  Search,
  Building2,
  QrCode,
  AlertTriangle,
  ChevronRight,
  FileText,
} from "lucide-react";

import ReportSelector from "./report/report-selector";
import DeletionApprovals, { RequestDeletion } from "./deletion-controls";
import { BrowserQRCodeReader } from "@zxing/browser";
import {
  conditions,
  priorities,
  maintenanceTypes,
  isUrgent,
} from "../lib/ratings";
import { AssetRatings } from "@/components/AssetRating";
import { elementsFor } from "@/lib/register-form";
import RegisterAssetForm from "@/components/RegisterAssetForm";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Tabs from "@/components/Tabs";
import MobileNav from "@/components/MobileNav";
import PageHeader from "@/components/PageHeader";

export type Asset = {
  id: string;
  location: string;
  company: string;
  element?: string;
  serial_number?: string;
  advertiser: string;
  contact: string;
  email: string;
  phone: string;
  last: string;
  next: string;
  comments: string;
  gps: string;
  condition: string;
  priority: string;
  maintenanceType: string;
  photos: any[];
};

const blank = (): Asset => ({
  id: "",
  location: "",
  company: "",
  element: "",
  serial_number: "",
  advertiser: "",
  contact: "",
  email: "",
  phone: "",
  last: "",
  next: "",
  comments: "",
  gps: "",
  condition: "Not assessed",
  priority: "Not assigned",
  maintenanceType: "Not specified",
  photos: [],
});

const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });

function status(a: Asset) {
  if (!a.next) return "Not scheduled";
  if (a.next < today()) return "Overdue";
  if (a.next <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10))
    return "Due soon";
  return "Scheduled";
}

export default function App({
  user,
}: {
  user: { name: string; email: string; role: string };
}) {
  const [view, setView] = useState("dashboard");

  const [assets, setAssets] = useState<Asset[]>([]),
    [selected, setSelected] = useState<Asset | null>(null),
    [edit, setEdit] = useState<Asset | null>(null),
    [creating, setCreating] = useState(false),
    [tab, setTab] = useState("details"),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All assets"),
    [companyFilter, setCompanyFilter] = useState("All companies"),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [scan, setScan] = useState(false),
    [scanText, setScanText] = useState(""),
    [scanError, setScanError] = useState("");

  const video = useRef<HTMLVideoElement>(null);

  async function load(focus?: string) {
    const r = await apiRequest("/api/assets");
    const raw: any = await r.json();
    if (!r.ok) throw Error(raw.error);
    const data: Asset[] = raw.map((a: any) => ({
      ...a,
      element: a.element || "",
      condition: a.condition || "Not assessed",
      priority: a.priority || "Not assigned",
      maintenanceType: a.maintenanceType || "Not specified",
      serial_number: a.serial_number || "",
    }));
    setAssets(data);
    const id =
      focus || new URLSearchParams(window.location.search).get("asset");
    if (id) {
      const a = data.find((x: Asset) => x.id === id);
      if (a) setSelected(a);
      else setError("Asset " + id + " was not found.");
    }
    setLoading(false);
  }

  useEffect(() => {
    load().catch((e) => {
      setError(e.message);
      setLoading(false);
    });
    const refresh = () => {
      load().catch((e) => setError(e.message));
    };
    window.addEventListener("assets-updated", refresh);
    return () => window.removeEventListener("assets-updated", refresh);
  }, []);

  function open(a: Asset) {
    setSelected(a);
    setEdit(null);
    setTab("details");
    history.replaceState(
      null,
      "",
      "/workspace?asset=" + encodeURIComponent(a.id),
    );
  }

  function find(raw: string) {
    let id = raw.trim();
    try {
      const u = new URL(id);
      id = u.searchParams.get("asset") || id;
    } catch {}
    const a = assets.find((x) => x.id === id.toUpperCase());
    if (a) {
      const href = "/qr?asset=" + encodeURIComponent(a.id);
      const popup = window.open(
        href,
        "board-asset",
        "popup,width=520,height=780",
      );
      if (!popup) window.location.assign(href);
      setScan(false);
      setScanError("");
    } else
      setScanError(
        "No asset matches this QR code. Check the number or register the asset.",
      );
  }

  useEffect(() => {
    if (!scan || !video.current) return;
    let controls: any;
    let cancelled = false;
    const reader = new BrowserQRCodeReader();
    reader
      .decodeFromVideoDevice(undefined, video.current, (result) => {
        if (result && !cancelled) find(result.getText());
      })
      .then((c) => {
        if (cancelled) c.stop();
        else controls = c;
      })
      .catch(() => {
        if (!cancelled)
          setScanError(
            "Camera could not start. Allow camera access, or enter the asset number below.",
          );
      });
    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [scan, assets]);

  async function save(e: React.SubmitEvent) {
    e.preventDefault();
    if (!edit) return;
    setBusy(true);
    setError("");
    try {
      const r = await apiRequest("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...edit, mode: creating ? "create" : "edit" }),
      });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      await load(edit.id);
      if (creating) {
        setTab("qr");
        history.replaceState(
          null,
          "",
          "/workspace?asset=" + encodeURIComponent(edit.id),
        );
      }
      setEdit(null);
      setCreating(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function gps() {
    if (!navigator.geolocation) {
      setError("GPS is unavailable on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) =>
        setEdit((a) =>
          a
            ? {
                ...a,
                gps:
                  p.coords.latitude.toFixed(6) +
                  ", " +
                  p.coords.longitude.toFixed(6),
              }
            : a,
        ),
      () =>
        setError(
          "Location could not be captured. Allow location access or enter coordinates manually.",
        ),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  const companyOptions = Array.from(
    new Set(assets.map((a) => a.company).filter(Boolean)),
  ).sort();

  const shown = assets.filter(
    (a) =>
      [a.id, a.location, a.company, a.advertiser]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (companyFilter === "All companies" || a.company === companyFilter) &&
      (filter === "All assets" ||
        (filter === "Urgent" ? isUrgent(a) : status(a) === filter)),
  );

  const urgent = assets.filter(isUrgent);
  const overdue = assets.filter((a) => status(a) === "Overdue").length,
    due = assets.filter((a) => status(a) === "Due soon").length;

  return (
    <div className="app">
      <Sidebar
        view={view}
        setView={setView}
        setSelected={setSelected}
        setEdit={setEdit}
        user={user}
        setScan={setScan}
        setScanError={setScanError}
      />
      <main>
        <Header setScan={setScan} />
        <div className="workspace">
          <MobileNav
            setView={setView}
            setSelected={setSelected}
            setEdit={setEdit}
            user={user}
          />
          <PageHeader
            view={view}
            user={user}
            downloadRegister={downloadRegister}
            setCreating={setCreating}
            setEdit={setEdit}
            blank={blank}
            setSelected={setSelected}
            setError={setError}
          />
          {!selected && !edit && (
            <div className="dashboard-reports no-print">
              <a className="button primary" href="/report">
                <FileText size={18} />
                All assets summary report
              </a>
              <ReportSelector assets={assets} />
            </div>
          )}
          {error && (
            <div className="error no-print" role="alert">
              {error}
              <button
                onClick={() => {
                  setError("");
                  load().catch((e) => setError(e.message));
                }}
              >
                Retry loading
              </button>
            </div>
          )}
          {view === "dashboard" && (
            <div className="stats no-print">
              <div className="urgent-stat">
                <span>URGENT BOARDS · P1</span>
                <strong className={urgent.length ? "red" : ""}>
                  {urgent.length.toString().padStart(2, "0")}
                </strong>
                <AlertTriangle />
              </div>
              <div>
                <span>REGISTERED ASSETS</span>
                <strong>{assets.length.toString().padStart(2, "0")}</strong>
                <Building2 />
              </div>
              <div>
                <span>MAINTENANCE OVERDUE</span>
                <strong className={overdue ? "red" : ""}>
                  {overdue.toString().padStart(2, "0")}
                </strong>
                <CalendarDays />
              </div>
              <div>
                <span>DUE IN THE NEXT 30 DAYS</span>
                <strong>{due.toString().padStart(2, "0")}</strong>
                <CalendarDays />
              </div>
            </div>
          )}
          {view === "dashboard" && !selected && !edit && !loading && (
            <section className="panel urgent-panel no-print">
              <div className="panel-title">
                <div>
                  <h2>
                    <AlertTriangle size={21} />
                    Urgent maintenance{" "}
                    <span className="badge priority-P1">
                      {urgent.length} boards
                    </span>
                  </h2>
                  <p>P1 boards requiring immediate attention</p>
                </div>
              </div>
              {urgent.length ? (
                <div className="urgent-list">
                  {urgent.map((a) => (
                    <button
                      key={a.id}
                      className="urgent-board"
                      onClick={() => open(a)}
                    >
                      <div>
                        <strong>{a.id}</strong>
                        <span>{a.location}</span>
                      </div>
                      <div>
                        <span
                          className={
                            "badge condition-" +
                            a.condition.replaceAll(" ", "-")
                          }
                        >
                          {a.condition}
                        </span>
                        <span>{a.maintenanceType}</span>
                      </div>
                      <div>
                        <span>Next due</span>
                        <b>{a.next || "Not scheduled"}</b>
                      </div>
                      <ChevronRight size={20} />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="urgent-empty">
                  No boards are currently marked P1 — Urgent.
                </p>
              )}
              <div className="condition-overview">
                {conditions.map((c) => (
                  <span
                    key={c}
                    className={"badge condition-" + c.replaceAll(" ", "-")}
                  >
                    {c} · {assets.filter((a) => a.condition === c).length}
                  </span>
                ))}
              </div>
            </section>
          )}
          {user.role === "admin" &&
            view === "dashboard" &&
            !selected &&
            !edit && <DeletionApprovals />}
          {edit ? (
            <RegisterAssetForm
              creating={creating}
              edit={edit}
              setEdit={setEdit}
              save={save}
              elementsFor={elementsFor}
              gps={gps}
              conditions={conditions}
              priorities={priorities}
              maintenanceTypes={maintenanceTypes}
              busy={busy}
            />
          ) : selected ? (
            <section className="panel">
              <div className="panel-title no-print">
                <div>
                  <button
                    className="text-button"
                    onClick={() => {
                      setSelected(null);
                      history.replaceState(null, "", "/workspace");
                    }}
                  >
                    Back to register
                  </button>
                  <h2 className="asset-record-heading">
                    <span className="asset-record-number">{selected.id}</span>{" "}
                    {isUrgent(selected) && (
                      <span className="badge priority-P1">P1 — Urgent</span>
                    )}{" "}
                    <span
                      className={
                        "badge " + status(selected).replaceAll(" ", "-")
                      }
                    >
                      {status(selected)}
                    </span>
                  </h2>
                  <p>{selected.location}</p>
                </div>
                {(() => {
                  const main = selected.photos.find(
                    (p) => p.isMain ?? p.is_main,
                  );
                  return main ? (
                    <img
                      src={"/api/photos/" + main.id}
                      alt={"Main image of " + selected.id}
                      style={{
                        width: "30%",
                        maxHeight: 320,
                        objectFit: "contain",
                        borderRadius: 8,
                        margin: 10,
                      }}
                    />
                  ) : null;
                })()}
                <div className="asset-header-actions">
                  <a
                    className="button"
                    href={"/report?asset=" + encodeURIComponent(selected.id)}
                  >
                    <FileText size={17} />
                    Print this asset summary report
                  </a>
                  <button
                    onClick={() => {
                      setCreating(false);
                      setEdit({ ...selected });
                    }}
                  >
                    Edit asset
                  </button>
                </div>
              </div>

              {user.role === "assessor" && (
                <RequestDeletion key={selected.id} assetId={selected.id} />
              )}
              <AssetRatings
                asset={selected}
                onSaved={async (id) => {
                  await load(id);
                }}
              />
              <Tabs
                tab={tab}
                setTab={setTab}
                selected={selected}
                user={user}
                load={load}
                busy={busy}
                setBusy={setBusy}
                setError={setError}
              />
            </section>
          ) : (
            <section className="panel register no-print">
              <div className="register-toolbar">
                <h2>
                  Assets <span>{assets.length}</span>
                </h2>
                <div className="tools">
                  <div className="search">
                    <Search size={18} />
                    <input
                      placeholder="Search asset, location or advertiser"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                  <select
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                    aria-label="Filter by company"
                  >
                    <option>All companies</option>
                    {companyOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {companyFilter !== "All companies" && (
                    <a
                      className="button primary"
                      href={
                        "/report?company=" + encodeURIComponent(companyFilter)
                      }
                    >
                      <FileText size={18} />
                      Print all {companyFilter} reports ({shown.length})
                    </a>
                  )}
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    {[
                      "All assets",
                      "Urgent",
                      "Overdue",
                      "Due soon",
                      "Scheduled",
                      "Not scheduled",
                    ].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </div>
              </div>
              {loading ? (
                <div className="empty">Loading your asset register…</div>
              ) : shown.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>ASSET / LOCATION</th>
                        <th>COMPANY / ADVERTISER</th>
                        <th>CONDITION / PRIORITY</th>
                        <th>MAINTENANCE TYPE</th>
                        <th>LAST MAINTENANCE</th>
                        <th>NEXT DUE</th>
                        <th>STATUS</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((a) => (
                        <tr
                          key={a.id}
                          className={isUrgent(a) ? "urgent-row" : ""}
                          onClick={() => open(a)}
                        >
                          <td>
                            <button
                              className="asset-link"
                              onClick={() => open(a)}
                            >
                              {a.id}
                            </button>
                            <span>
                              <MapPin size={14} />
                              {a.location}
                            </span>
                          </td>
                          <td>
                            <b>{a.company}</b>
                            <span>
                              {a.advertiser || "No advertiser recorded"}
                            </span>
                          </td>
                          <td>
                            <span
                              className={
                                "badge condition-" +
                                a.condition.replaceAll(" ", "-")
                              }
                            >
                              {a.condition}
                            </span>
                            <span
                              className={
                                "badge priority-" +
                                (a.priority.startsWith("P")
                                  ? a.priority.slice(0, 2)
                                  : "none")
                              }
                            >
                              {a.priority}
                            </span>
                          </td>
                          <td>{a.maintenanceType}</td>
                          <td>{a.last || "—"}</td>
                          <td>{a.next || "—"}</td>
                          <td>
                            <span
                              className={
                                "badge " + status(a).replaceAll(" ", "-")
                              }
                            >
                              {status(a)}
                            </span>
                          </td>
                          <td>
                            <ChevronRight size={18} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty">
                  <div className="empty-icon">
                    <QrCode size={42} />
                  </div>
                  <h3>
                    {assets.length
                      ? "No matching assets"
                      : "Your first billboard starts here"}
                  </h3>
                  <p>
                    {assets.length
                      ? "Try another search or maintenance filter."
                      : "Register the asset, capture its site details and generate a label."}
                  </p>
                  {!assets.length && (
                    <button
                      className="primary"
                      onClick={() => {
                        setCreating(true);
                        setEdit(blank());
                      }}
                    >
                      <Plus size={18} />
                      Register your first asset
                    </button>
                  )}
                </div>
              )}
              <div className="register-foot">
                <span>Permanent asset numbers · Live maintenance records</span>
                <span>1C</span>
              </div>
            </section>
          )}
        </div>
      </main>
      {scan && (
        <div className="overlay no-print">
          <section className="scan-modal">
            <div className="panel-title">
              <h2>Scan an asset</h2>
              <button onClick={() => setScan(false)} aria-label="Close scanner">
                <X />
              </button>
            </div>
            <div className="camera-view">
              <video ref={video} autoPlay muted playsInline />
              <div className="scan-frame" />
            </div>
            <p>Point your camera at a QR label.</p>
            {scanError && <div className="error">{scanError}</div>}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                find(scanText);
              }}
            >
              <label>
                Or enter the asset number
                <input
                  autoCapitalize="characters"
                  value={scanText}
                  onChange={(e) => setScanText(e.target.value)}
                  placeholder="BB-0001"
                  required
                />
              </label>
              <button className="primary">Open asset</button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
