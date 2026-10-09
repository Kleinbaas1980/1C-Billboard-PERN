"use client";
import { apiRequest } from "@/api/http";
import { useState } from "react";
export default function UploadPasswordForm({ members }: { members: any[] }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section className="panel">
      <div className="panel-title">
        <h2>Set / reset photo upload password</h2>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage("");
          try {
            const r = await apiRequest("/api/upload-password", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, password }),
            });
            const d: any = await r.json();
            if (!r.ok) throw Error(d.error);
            setPassword("");
            setMessage(
              "Password saved. Share it directly with this team member. Previous upload access is revoked.",
            );
          } catch (e: any) {
            setMessage(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          <label>
            Team member
            <select
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            >
              <option value="">Select a team member</option>
              {members.map((m) => (
                <option key={m.email} value={m.email}>
                  {m.name} · {m.email}
                </option>
              ))}
            </select>
          </label>
          <label>
            New upload password
            <input
              type="password"
              minLength={12}
              maxLength={128}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        </div>
        <div className="form-footer">
          <p role="status">
            {message ||
              "Use at least 12 characters. Each team member has their own password."}
          </p>
          <button className="primary" disabled={busy}>
            Save upload password
          </button>
        </div>
      </form>
    </section>
  );
}
