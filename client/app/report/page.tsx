"use client";
import { useEffect, useState } from "react";
import { getAssets } from "@/api/assets";
import { apiError } from "@/api/http";
import { RequireAuth, useAuth } from "@/contexts/auth-context";
import { isUrgent } from "@/lib/ratings";
import PrintControls from "./print-controls";
import ReportSelector from "./report-selector";
import PortfolioCharts from "./portfolio-charts";
export default function ReportPage() {
  return (
    <RequireAuth>
      <Report />
    </RequireAuth>
  );
}
function Report() {
  const { user } = useAuth();
  const [allAssets, setAllAssets] = useState<any[]>([]),
    [params, setParams] = useState<{ asset?: string }>({}),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    setParams({
      asset:
        new URLSearchParams(window.location.search).get("asset") || undefined,
    });
    getAssets()
      .then(setAllAssets)
      .catch((e) => setError(apiError(e)))
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <main className="access-page">Loading report…</main>;
  if (error) return <main className="access-page">{error}</main>;
  const assets = params.asset
    ? allAssets.filter((a) => a.id === params.asset)
    : allAssets;
  const photos = allAssets.flatMap((a) => a.photos);
  const date = new Date().toLocaleDateString("en-ZA", {
    timeZone: "Africa/Johannesburg",
  });
  return (
    <div className="report">
      <PrintControls />
      <ReportSelector
        assets={allAssets}
        selected={params.asset ? String(params.asset) : ""}
      />
      <section className="report-cover">
        <div className="cover-angle cover-angle-orange" />
        <div className="cover-angle cover-angle-grey" />
        <div className="cover-brand">
          <img src="/1c-logo.png" alt="1C" />
          <span>OUTDOOR ADVERTISING</span>
        </div>
        <div className="cover-title">
          <div className="eyebrow">BILLBOARD ASSET MANAGEMENT</div>
          <h1>
            {params.asset ? "Asset summary report" : "Portfolio summary report"}
          </h1>
          <p>
            {params.asset
              ? "Asset " + String(params.asset)
              : "All registered billboard assets"}
          </p>
        </div>
        <img
          className="cover-billboard"
          src="/billboard-welcome.png"
          alt="Roadside billboard structure"
        />
        <dl className="cover-details">
          <div>
            <dt>Report date</dt>
            <dd>{date}</dd>
          </div>
          <div>
            <dt>Prepared by</dt>
            <dd>{user?.name}</dd>
          </div>
          <div>
            <dt>{params.asset ? "Location" : "Assets included"}</dt>
            <dd>
              {params.asset
                ? assets[0]?.location || "Asset not found"
                : assets.length}
            </dd>
          </div>
          <div>
            <dt>{params.asset ? "Company" : "Report scope"}</dt>
            <dd>
              {params.asset
                ? assets[0]?.company || "Not recorded"
                : "Condition, priority, maintenance and photographs"}
            </dd>
          </div>
        </dl>
        <div className="cover-footer">
          1Crew1Project · Billboard assessment and maintenance
        </div>
      </section>
      <header className="report-header">
        <img src="/1c-logo.png" alt="1C" />
        <div>
          <div className="eyebrow">BILLBOARD ASSET MANAGEMENT</div>
          <h1>
            {params.asset
              ? "Asset summary report"
              : "All assets summary report"}
          </h1>
          <p>
            {params.asset ? "Asset " + params.asset : "Portfolio overview"} ·{" "}
            {date}
          </p>
          <p>Prepared by {user?.name}</p>
        </div>
      </header>
      <div className="report-metrics">
        <div>
          <b>{assets.length}</b>
          <span>Boards included</span>
        </div>
        <div>
          <b>{assets.filter(isUrgent).length}</b>
          <span>P1 — Urgent</span>
        </div>
        <div>
          <b>
            {
              assets.filter((a) => ["Poor", "Very Poor"].includes(a.condition))
                .length
            }
          </b>
          <span>Poor / Very Poor</span>
        </div>
        <div>
          <b>
            {
              assets.filter(
                (a) =>
                  a.next &&
                  a.next <
                    new Date().toLocaleDateString("en-CA", {
                      timeZone: "Africa/Johannesburg",
                    }),
              ).length
            }
          </b>
          <span>Maintenance overdue</span>
        </div>
      </div>
      {!params.asset && (
        <>
          <PortfolioCharts assets={assets} />
          <section className="portfolio-register">
            <h2>All assets overview</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Location / advertiser</th>
                    <th>Condition</th>
                    <th>Priority</th>
                    <th>Maintenance type</th>
                    <th>Next due</th>
                    <th>Photos</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <a href={"/report?asset=" + encodeURIComponent(a.id)}>
                          {a.id}
                        </a>
                      </td>
                      <td>
                        {a.location}
                        <br />
                        <small>
                          {a.advertiser || "No advertiser recorded"}
                        </small>
                      </td>
                      <td>{a.condition}</td>
                      <td>{a.priority}</td>
                      <td>{a.maintenanceType || "Not specified"}</td>
                      <td>{a.next || "Not scheduled"}</td>
                      <td>
                        {photos.filter((p) => p.asset_id === a.id).length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      {!assets.length && <p>No assets were found for this report.</p>}
      {assets.map((a) => (
        <article className="report-asset" key={a.id}>
          <header>
            <h2>
              <a href={"/report?asset=" + encodeURIComponent(a.id)}>{a.id}</a>
            </h2>
            <span className={"badge priority-" + a.priority.slice(0, 2)}>
              {a.priority}
            </span>
            <span
              className={"badge condition-" + a.condition.replaceAll(" ", "-")}
            >
              {a.condition}
            </span>
          </header>
          <div className="report-details">
            {[
              ["Company", a.company],
              ["Location", a.location],
              ["GPS coordinates", a.gps],
              ["Advertiser", a.advertiser],
              ["Advertiser contact", a.contact],
              ["Email", a.email],
              ["Phone", a.phone],
              ["Maintenance type", a.maintenanceType],
              ["Last maintenance", a.last],
              ["Next maintenance due", a.next],
              ["Last recorded by", a.assessor],
            ].map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <b>{v || "Not recorded"}</b>
              </div>
            ))}
          </div>
          <section className="report-comments">
            <h3>General comments</h3>
            <p>{a.comments || "No comments recorded."}</p>
          </section>
          <section>
            <h3>Site photographs</h3>
            {photos.some((p) => p.asset_id === a.id) ? (
              <div className="report-photos">
                {photos
                  .filter((p) => p.asset_id === a.id)
                  .map((p: any, i: number) => (
                    <figure key={p.id}>
                      <img
                        src={"/api/photos/" + p.id}
                        alt={"Site photo " + (i + 1) + " for " + a.id}
                      />
                      <figcaption>
                        {a.id} · Photo {i + 1} · {p.name}
                      </figcaption>
                    </figure>
                  ))}
              </div>
            ) : (
              <p>No photographs uploaded for this board.</p>
            )}
          </section>
        </article>
      ))}
      <footer className="report-footer">
        1C · Billboard condition and maintenance summary · {date}
      </footer>
    </div>
  );
}
