"use client";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { authApi } from "@/api/auth";
import { apiError } from "@/api/http";
export default function Login() {
  const { user, loading, login, logout, reload } = useAuth();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [newPassword, setNewPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await login(email, password);
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.assign(
        next?.startsWith("/") &&
          !next.startsWith("//") &&
          !next.startsWith("/\\")
          ? next
          : "/workspace",
      );
    } catch (e) {
      setMessage(apiError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="access-page">
      <img
        src="/1c-logo.png"
        width="150"
        alt="1C empowered by 1 crew 1 project"
      />
      <h1>{user ? "Your account" : "Team sign in"}</h1>
      {loading ? (
        <p>Loading…</p>
      ) : user ? (
        <>
          <p>
            {user.name} · {user.role}
          </p>
          <a className="button primary" href="/workspace">
            Open dashboard
          </a>
          <button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              logout()
                .then(() => window.location.assign("/"))
                .catch((e) => setMessage(apiError(e)))
                .finally(() => setBusy(false));
            }}
          >
            Sign out
          </button>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await authApi.changePassword(password, newPassword);
                setPassword("");
                setNewPassword("");
                await reload();
                setMessage("Password changed. Sign in again.");
              } catch (e) {
                setMessage(apiError(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            <h2>Change login password</h2>
            <label>
              Current password
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label>
              New password
              <input
                required
                minLength={12}
                maxLength={128}
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </label>
            <button disabled={busy}>Change password</button>
          </form>
        </>
      ) : (
        <form onSubmit={signIn}>
          <label>
            Email
            <input
              required
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              required
              type="password"
              maxLength={128}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button className="primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <p>Accounts are created by your administrator.</p>
        </form>
      )}
      {message && <p role="status">{message}</p>}
      <p>
        <a href="/">Home</a>
      </p>
    </main>
  );
}
