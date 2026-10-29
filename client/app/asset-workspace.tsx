"use client";
import { downloadRegister } from "@/services/assets";
import { apiRequest } from "@/services/http";
import PhotoUploadGate from "./photo-upload-gate";
import { useEffect, useRef, useState } from "react";
import {
  Plus,
  ScanLine,
  MapPin,
  CalendarDays,
  X,
  Search,
  Building2,
  LocateFixed,
  QrCode,
  AlertTriangle,
  ClipboardList,
  ChevronRight,
  LayoutDashboard,
  FileText,
  Users,
  Home,
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
import { Label } from "@/components/GenerateQr";
import { AssetRatings } from "@/components/AssetRating";
import MainImageUpload from "./main-image-upload";
import { COMPANIES, elementsFor } from "@/lib/register-form";

export type Asset = {
  id: string;
  location: string;
  company: string;
  element?: string;
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

  async function save(e: React.FormEvent) {
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

  const shown = assets.filter(
    (a) =>
      [a.id, a.location, a.company, a.advertiser]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "All assets" ||
        (filter === "Urgent" ? isUrgent(a) : status(a) === filter)),
  );

  const urgent = assets.filter(isUrgent);
  const overdue = assets.filter((a) => status(a) === "Overdue").length,
    due = assets.filter((a) => status(a) === "Due soon").length;
  return (
    <div className="app">
      <aside className="sidebar no-print">
        <div className="brand">
          <img src="/1c-logo.png" alt="1C" />
        </div>
        <div className="division">OUTDOOR ADVERTISING</div>
        <button
          className={"nav " + (view === "dashboard" ? "active" : "")}
          onClick={() => {
            setView("dashboard");
            setSelected(null);
            setEdit(null);
            history.replaceState(null, "", "/workspace");
          }}
        >
          <LayoutDashboard size={20} />
          Dashboard
        </button>
        <button
          className={"nav " + (view === "register" ? "active" : "")}
          onClick={() => {
            setView("register");
            setSelected(null);
            setEdit(null);
            history.replaceState(null, "", "/workspace");
          }}
        >
          <ClipboardList size={20} />
          Asset register
        </button>
        <a className="nav" href="/report">
          <FileText size={20} />
          All assets summary
        </a>
        {user.role === "admin" && (
          <a className="nav" href="/admin">
            <Users size={20} />
            Manage assessors
          </a>
        )}
        <button
          className="nav"
          onClick={() => {
            setScan(true);
            setScanError("");
          }}
        >
          <ScanLine size={20} />
          Scan an asset
        </button>
        <div className="side-note">
          <QrCode size={32} />
          <b>Every asset. One record.</b>
          <p>
            Register on site, attach a label and keep maintenance up to date.
          </p>
        </div>
        <footer>
          <b>{user.name}</b>
          <br />
          {user.role === "admin" ? "Admin" : "Assessor"}
          <br />
          <a href="/login">Account / sign out</a>
        </footer>
      </aside>
      <main>
        <header className="topbar no-print">
          <span>
            ASSET MANAGEMENT <span className="slash">/</span> BILLBOARDS
          </span>
          <div className="topbar-actions">
            <a className="button" href="/">
              <Home size={18} />
              Home
            </a>
            <button onClick={() => setScan(true)}>
              <ScanLine size={18} />
              Scan QR code
            </button>
          </div>
        </header>
        <div className="workspace">
          <div className="mobile-nav no-print">
            <button
              onClick={() => {
                setView("dashboard");
                setSelected(null);
                setEdit(null);
              }}
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                setView("register");
                setSelected(null);
                setEdit(null);
              }}
            >
              Assets
            </button>
            <a className="button" href="/report">
              Report
            </a>
            {user.role === "admin" && (
              <a className="button" href="/admin">
                Team
              </a>
            )}
            <a className="button" href="/login">
              Account
            </a>
          </div>
          <div className="page-heading no-print">
            <div>
              <div className="eyebrow">YOUR BILLBOARD PORTFOLIO</div>
              <h1>
                {view === "dashboard" ? "Dashboard" : "Asset register"}
                <span>.</span>
              </h1>
              <p>Site records, advertisers and maintenance in one place.</p>
            </div>
            {user.role === "admin" && (
              <button
                onClick={() =>
                  downloadRegister().catch((e) => setError(e.message))
                }
              >
                Download Excel register
              </button>
            )}
            <button
              className="primary"
              onClick={() => {
                setCreating(true);
                setEdit(blank());
                setSelected(null);
                setError("");
              }}
            >
              <Plus size={20} />
              Register asset
            </button>
          </div>
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
            <section className="panel no-print">
              {/* ______________________________Register Asset Form__________________________  */}
              <div className="panel-title">
                <h2>
                  {creating ? "Register a Asset" : "Edit asset · " + edit.id}
                </h2>
                <button onClick={() => setEdit(null)} aria-label="Close form">
                  <X />
                </button>
              </div>
              <form onSubmit={save}>
                <div className="form-grid">
                  <label>
                    Company *
                    <select
                      required
                      value={edit.company}
                      onChange={(e) =>
                        // reset element, otherwise a stale value from the previous company survives
                        setEdit({
                          ...edit,
                          company: e.target.value,
                          element: "",
                        })
                      }
                    >
                      <option value="">Select a company…</option>
                      {/* keeps old records (e.g. "1Crew1Project") editable instead of blanking them */}
                      {edit.company &&
                        !COMPANIES.includes(edit.company as any) && (
                          <option value={edit.company}>{edit.company}</option>
                        )}
                      {COMPANIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>

                  {elementsFor(edit.company).length > 0 && (
                    <label>
                      Element being assessed *
                      <select
                        required
                        value={edit.element}
                        onChange={(e) =>
                          setEdit({ ...edit, element: e.target.value })
                        }
                      >
                        <option value="">Select an element…</option>
                        {elementsFor(edit.company).map((el) => (
                          <option key={el} value={el}>
                            {el}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {[
                    ["id", "Asset number", "e.g. BB-0001"],
                    ["location", "Site location", "Street, suburb, city"],
                    ["advertiser", "Advertiser / brand", "Advertiser company"],
                    ["contact", "Advertiser contact person", "Full name"],
                    ["email", "Advertiser email", "name@company.co.za"],
                    ["phone", "Advertiser phone", "Contact number"],
                    ["last", "Last maintenance date", ""],
                    ["next", "Next maintenance due", ""],
                  ].map(([key, label, placeholder]) => (
                    <label key={key}>
                      {label}
                      {["id", "company", "location"].includes(key) && " *"}
                      <input
                        required={["id", "company", "location"].includes(key)}
                        disabled={key === "id" && !creating}
                        maxLength={key === "id" ? 40 : 500}
                        type={
                          key === "email"
                            ? "email"
                            : ["last", "next"].includes(key)
                              ? "date"
                              : "text"
                        }
                        value={(edit as any)[key]}
                        placeholder={placeholder}
                        onChange={(e) =>
                          setEdit({
                            ...edit,
                            [key]:
                              key === "id"
                                ? e.target.value.toUpperCase()
                                : e.target.value,
                          })
                        }
                      />
                    </label>
                  ))}
                  <label>
                    GPS coordinates
                    <div className="input-action">
                      <input
                        value={edit.gps}
                        placeholder="Latitude, longitude"
                        onChange={(e) =>
                          setEdit({ ...edit, gps: e.target.value })
                        }
                      />
                      <button
                        type="button"
                        onClick={gps}
                        title="Capture current GPS location"
                      >
                        <LocateFixed size={20} />
                      </button>
                    </div>
                  </label>
                  {[
                    ["condition", "Condition rating", conditions],
                    ["priority", "Priority rating", priorities],
                    [
                      "maintenanceType",
                      "Type of maintenance",
                      maintenanceTypes,
                    ],
                  ].map(([key, label, options]) => (
                    <label key={key as string}>
                      {label as string}
                      <select
                        value={(edit as any)[key as string]}
                        onChange={(e) =>
                          setEdit({ ...edit, [key as string]: e.target.value })
                        }
                      >
                        {(options as string[]).map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                  <label className="full">
                    General comments
                    <textarea
                      rows={4}
                      value={edit.comments}
                      onChange={(e) =>
                        setEdit({ ...edit, comments: e.target.value })
                      }
                      placeholder="Condition, work completed, access notes or maintenance requirements"
                    />
                  </label>
                </div>
                <div className="form-footer">
                  <small>
                    Save the asset to generate its QR code and add site photos.
                  </small>
                  <button className="primary" disabled={busy}>
                    {busy ? "Saving…" : "Save asset"}
                  </button>
                </div>
              </form>
              {/* _______________________________________________________________________________________________ */}
            </section>
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
                    This asset summary report
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
              <div className="tabs no-print">
                {["details", "photos", "qr"].map((t) => (
                  <button
                    className={tab === t ? "chosen" : ""}
                    key={t}
                    onClick={() => setTab(t)}
                  >
                    {t === "qr"
                      ? "QR code & label"
                      : t === "photos"
                        ? "Site photos"
                        : "Asset details"}
                  </button>
                ))}
              </div>
              {tab === "details" && (
                <div className="detail-grid no-print">
                  {[
                    ["Company", selected.company],
                    ["Element", selected.element],
                    ["Location", selected.location],
                    ["Advertiser", selected.advertiser],
                    ["Contact person", selected.contact],
                    ["Email", selected.email],
                    ["Phone", selected.phone],
                    ["Last maintenance", selected.last],
                    ["Next maintenance due", selected.next],
                    ["GPS coordinates", selected.gps],
                    ["Condition rating", selected.condition],
                    ["Priority rating", selected.priority],
                    ["Type of maintenance", selected.maintenanceType],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <span>{k}</span>
                      <strong>{v || "Not recorded"}</strong>
                    </div>
                  ))}
                  <div className="full comments">
                    <span>General comments</span>
                    <p>{selected.comments || "No comments recorded."}</p>
                  </div>
                </div>
              )}
              {tab === "photos" && (
                <div className="photo-section no-print">
                  {user.role === "admin" && (
                    <MainImageUpload
                      asset={selected.id}
                      onUploaded={async () => {
                        await load(selected.id);
                      }}
                    />
                  )}
                  <PhotoUploadGate
                    asset={selected.id}
                    onUploaded={async () => {
                      await load(selected.id);
                    }}
                  />
                  <div className="photo-grid">
                    {selected.photos.map((p) => (
                      <figure key={p.id}>
                        <a
                          href={"/api/photos/" + p.id}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img src={"/api/photos/" + p.id} alt={p.name} />
                        </a>
                        <figcaption>
                          {p.name}
                          {(p.isMain ?? p.is_main) && (
                            <span className="badge">Main</span>
                          )}
                          {(user.role === "admin" ||
                            !(p.isMain ?? p.is_main)) && (
                            <button
                              disabled={busy}
                              onClick={async () => {
                                if (!confirm("Remove this photo?")) return;
                                setBusy(true);
                                try {
                                  const r = await apiRequest(
                                    "/api/photos/" + p.id,
                                    { method: "DELETE" },
                                  );
                                  if (!r.ok)
                                    throw Error("Unable to remove photo");
                                  await load(selected.id);
                                } catch (e: any) {
                                  setError(e.message);
                                } finally {
                                  setBusy(false);
                                }
                              }}
                              aria-label="Remove photo"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              )}
              {tab === "qr" && (
                <div className="barcode-section">
                  <p className="no-print">
                    Print and attach this label to the billboard. Scan the QR
                    code to open this board’s separate asset card. Photo uploads
                    require assessor sign-in and an upload password.
                  </p>
                  <Label asset={selected} />
                </div>
              )}
            </section>
          ) : (
            <section className="panel register no-print">
              <div className="register-toolbar">
                <h2>
                  Billboard assets <span>{assets.length}</span>
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
