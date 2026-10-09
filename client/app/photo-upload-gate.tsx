"use client";
import { apiRequest } from "@/services/http";
import { useEffect, useState } from "react";
export default function PhotoUploadGate({
  asset,
  onUploaded,
}: {
  asset: string;
  onUploaded?: () => Promise<void>;
}) {
  const [unlocked, setUnlocked] = useState(false),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    setUnlocked(false);
    apiRequest("/api/upload-unlock?asset=" + encodeURIComponent(asset))
      .then((r) => r.json())
      .then((d: any) => setUnlocked(!!d.unlocked))
      .catch(() => {});
  }, [asset]);
  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const r = await apiRequest("/api/upload-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset, password }),
      });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      setPassword("");
      setUnlocked(true);
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(files: FileList | null) {
    if (!files) return;
    setBusy(true);
    setMessage("");
    let count = 0;
    try {
      for (const file of Array.from(files)) {
        const f = new FormData();
        f.set("asset", asset);
        f.set("file", file);
        const r = await apiRequest("/api/photos", { method: "POST", body: f });
        const d: any = await r.json();
        if (!r.ok) {
          if (r.status === 403) setUnlocked(false);
          throw Error(d.error);
        }
        count++;
      }
      await onUploaded?.();
      setMessage(
        `${count} photo${count === 1 ? "" : "s"} uploaded to ${asset}.`,
      );
    } catch (e: any) {
      setMessage((count ? `${count} uploaded. ` : "") + e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="upload-gate">
      <h2>Assessor photo uploads</h2>
      {!unlocked ? (
        <form onSubmit={unlock}>
          <p>
            Enter your admin-issued upload password. Upload access lasts 30
            minutes for this board.
          </p>
          <label>
            Upload password
            <input
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button className="primary" disabled={busy}>
            {busy ? "Checking…" : "Unlock photo uploads"}
          </button>
        </form>
      ) : (
        <div className="photo-actions">
          <label className="photo-choice">
            <b>Take photo</b>
            <span>Use your camera</span>
            <input
              disabled={busy}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                upload(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          <label className="photo-choice">
            <b>Upload photos</b>
            <span>Select multiple JPG, PNG or WebP photos · 10 MB each</span>
            <input
              disabled={busy}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => {
                upload(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      )}
      {busy && <p>Working…</p>}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
