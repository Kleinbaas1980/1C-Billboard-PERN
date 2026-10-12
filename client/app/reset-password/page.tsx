"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { authApi } from "@/services/auth";
import { apiError } from "@/services/http";

function passwordProblem(p: string) {
  if (p.length < 12) return "Password must be at least 12 characters.";
  if (p.length > 128) return "Password must be at most 128 characters.";
  if (
    !/[a-z]/.test(p) ||
    !/[A-Z]/.test(p) ||
    !/[0-9]/.test(p) ||
    !/[^A-Za-z0-9]/.test(p)
  )
    return "Use lower-case and capital letters, a number and a special character.";
  return "";
}

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");

    const problem = passwordProblem(password);
    if (problem) return setMessage(problem);
    if (password !== confirm) return setMessage("Passwords do not match.");

    setBusy(true);
    try {
      setMessage(await authApi.resetPassword(token, password));
      setDone(true);
    } catch (error) {
      setMessage(apiError(error));
    } finally {
      setBusy(false);
    }
  };

  if (!token)
    return (
      <div className="access-page">
        <h1>Reset password</h1>
        <p>This reset link is missing its token. Please request a new one.</p>
        <Link href="/forgot">Request a new link</Link>
      </div>
    );

  if (done)
    return (
      <div className="access-page">
        <h1>Password changed</h1>
        <p>{message}</p>
        <Link href="/login" className="primary">
          Go to sign in
        </Link>
      </div>
    );

  return (
    <form onSubmit={handleSubmit} className="access-page">
      <img
        src="/1c-logo.png"
        width="150"
        alt="1C empowered by 1 crew 1 project"
      />
      <h1>Reset password</h1>

      <label>
        New password
        <input
          required
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>

      <label>
        Confirm new password
        <input
          required
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </label>

      <p>
        At least 12 characters, with upper and lower case, a number and a
        symbol.
      </p>

      <button type="submit" className="primary" disabled={busy}>
        {busy ? "Saving" : "Reset password"}
      </button>

      {message && <p role="alert">{message}</p>}
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
