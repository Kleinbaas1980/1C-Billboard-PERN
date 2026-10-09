"use client";
import { apiRequest } from "@/api/http";
import { useEffect, useState } from "react";
import UploadPasswordForm from "./upload-password-form";
import DeletionApprovals from "../deletion-controls";
export default function TeamAdmin() {
  const [members, setMembers] = useState<any[]>([]),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [role, setRole] = useState("assessor"),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function load() {
    const r = await apiRequest("/api/members");
    const d: any = await r.json();
    if (!r.ok) throw Error(d.error);
    setMembers(d);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await apiRequest("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          role,
          password: password || undefined,
        }),
      });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      await load();
      setName("");
      setEmail("");
      setRole("assessor");
      setPassword("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-page">
      <a href="/workspace">Back to dashboard</a>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ADMIN</div>
          <h1>
            Team access<span>.</span>
          </h1>
          <p>Add assessors and assign account roles.</p>
        </div>
        <img src="/1c-logo.png" alt="1C" width="180" />
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <section className="panel">
        <div className="panel-title">
          <h2>Add / update team member</h2>
        </div>
        <form onSubmit={save}>
          <div className="form-grid">
            <label>
              Full name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Account email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Initial / reset login password
              <input
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Required for new accounts"
              />
            </label>
            <label>
              Role
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="assessor">Assessor</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          </div>
          <div className="form-footer">
            <p>
              Their assigned role controls access. Set their photo upload
              password below.
            </p>
            <button className="primary" disabled={busy}>
              {busy ? "Saving…" : "Save team member"}
            </button>
          </div>
        </form>
      </section>
      <section className="panel team-table">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>NAME</th>
                <th>ACCOUNT EMAIL</th>
                <th>ROLE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.email}>
                  <td>{m.name}</td>
                  <td>{m.email}</td>
                  <td>{m.role}</td>
                  <td>
                    {m.owner ? (
                      "Owner"
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setName(m.name);
                            setEmail(m.email);
                            setRole(m.role);
                          }}
                        >
                          Edit role
                        </button>
                        <button
                          disabled={busy}
                          onClick={async () => {
                            if (
                              !confirm(
                                "Deactivate account for " + m.email + "?",
                              )
                            )
                              return;
                            setBusy(true);
                            try {
                              const r = await apiRequest("/api/members", {
                                method: "DELETE",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ email: m.email }),
                              });
                              const d: any = await r.json();
                              if (!r.ok) throw Error(d.error);
                              await load();
                            } catch (e: any) {
                              setError(e.message);
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <UploadPasswordForm members={members} />
      <DeletionApprovals />
      <p className="role-help">
        Admins manage team access and board records. Assessors capture board
        details, ratings, maintenance notes and photos, and view reports.
      </p>
    </div>
  );
}
