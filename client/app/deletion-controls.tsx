"use client";
import { apiRequest } from "@/api/http";
import { useEffect, useState } from "react";
async function requests(): Promise<any[]> {
  const r = await apiRequest("/api/deletion-requests");
  const d: any = await r.json();
  if (!r.ok) throw Error(d.error);
  return d;
}
export function RequestDeletion({ assetId }: { assetId: string }) {
  const [items, setItems] = useState<any[]>([]),
    [opened, setOpened] = useState(false),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    requests()
      .then((d) => {
        if (active) {
          setItems(d);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [assetId]);
  const latest = items.find((r) => r.asset_id === assetId),
    pending = latest?.status === "pending";
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await apiRequest("/api/deletion-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, reason }),
      });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      setItems(await requests());
      setOpened(false);
      setReason("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="deletion-request no-print">
      <div>
        <h3>Asset deletion</h3>
        <p>
          Deleting this asset requires admin approval. It remains active while
          the request is pending.
        </p>
      </div>
      {pending ? (
        <p className="deletion-pending" role="status">
          Deletion requested · Awaiting admin approval
        </p>
      ) : (
        <button disabled={loading || busy} onClick={() => setOpened(!opened)}>
          {opened ? "Cancel request" : "Request asset deletion"}
        </button>
      )}
      {latest?.status === "rejected" && (
        <p>
          Your last deletion request was rejected. The asset remains active.
        </p>
      )}
      {error && (
        <p className="rating-error" role="alert">
          {error}
        </p>
      )}
      {opened && !pending && (
        <form onSubmit={submit}>
          <label>
            Reason for deletion
            <textarea
              required
              maxLength={2000}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this board should be removed from the register"
            />
          </label>
          <button className="primary" disabled={busy || !reason.trim()}>
            {busy ? "Submitting…" : "Submit to admin"}
          </button>
        </form>
      )}
    </section>
  );
}
export default function DeletionApprovals() {
  const [items, setItems] = useState<any[]>([]),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  async function load() {
    setItems(await requests());
  }
  useEffect(() => {
    load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  async function review(id: string, decision: string, asset: string) {
    if (
      !confirm(
        decision === "approved"
          ? "Approve deletion of " +
              asset +
              "? This removes it from the active register and reports."
          : "Reject the deletion request for " + asset + "?",
      )
    )
      return;
    setBusy(id);
    setError("");
    try {
      const r = await apiRequest("/api/deletion-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, decision }),
      });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      await load();
      window.dispatchEvent(new Event("assets-updated"));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }
  const pending = items.filter((r) => r.status === "pending");
  return (
    <section className="panel deletion-approvals no-print">
      <div className="panel-title">
        <div>
          <h2>
            Asset deletion approvals{" "}
            <span className="badge">{pending.length} pending</span>
          </h2>
          <p>Review assessor requests before removing a board.</p>
        </div>
        <button
          disabled={!!busy}
          onClick={() =>
            load()
              .then(() => setError(""))
              .catch((e) => setError(e.message))
          }
        >
          Refresh requests
        </button>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {loading ? (
        <p className="approval-empty">Loading requests…</p>
      ) : pending.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ASSET / LOCATION</th>
                <th>REQUESTED BY</th>
                <th>REASON</th>
                <th>DECISION</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((r) => {
                let a: any = {};
                try {
                  a = JSON.parse(r.asset_data || "{}");
                } catch {}
                return (
                  <tr key={r.id}>
                    <td>
                      <a
                        href={
                          "/workspace?asset=" + encodeURIComponent(r.asset_id)
                        }
                      >
                        {r.asset_id}
                      </a>
                      <p>{a.location}</p>
                    </td>
                    <td>
                      <b>{r.requester_name}</b>
                      <p>{r.requested_by}</p>
                      <small>
                        {new Date(r.created_at).toLocaleString("en-ZA")}
                      </small>
                    </td>
                    <td className="request-reason">{r.reason}</td>
                    <td>
                      <div className="approval-actions">
                        <button
                          className="primary"
                          disabled={!!busy}
                          onClick={() => review(r.id, "approved", r.asset_id)}
                        >
                          {busy === r.id ? "Saving…" : "Approve deletion"}
                        </button>
                        <button
                          disabled={!!busy}
                          onClick={() => review(r.id, "rejected", r.asset_id)}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="approval-empty">
          No asset deletion requests awaiting approval.
        </p>
      )}
      <details className="deletion-history">
        <summary>Reviewed requests</summary>
        {items.filter((r) => r.status !== "pending").length ? (
          <ul>
            {items
              .filter((r) => r.status !== "pending")
              .map((r) => (
                <li key={r.id}>
                  <b>
                    {r.asset_id} ·{" "}
                    {r.status === "approved" ? "Approved" : "Rejected"}
                  </b>
                  <span>{r.reason}</span>
                  <small>
                    Requested by {r.requester_name} · Reviewed by{" "}
                    {r.reviewed_by} ·{" "}
                    {new Date(r.reviewed_at).toLocaleString("en-ZA")}
                  </small>
                </li>
              ))}
          </ul>
        ) : (
          <p>No reviewed requests.</p>
        )}
      </details>
    </section>
  );
}
