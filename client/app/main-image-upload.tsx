"use client";

import { useRef, useState } from "react";
import { api, apiError } from "@/services/http";

export default function MainImageUpload({
  asset,
  onUploaded,
}: {
  asset: string;
  onUploaded: () => Promise<void> | void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const file = input.current?.files?.[0];
    if (!file) return setMessage("Select a photo.");

    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("asset", asset);
      form.append("file", file); // must be "file" to match the Multer route
      await api.post("/photos/main", form); // don't set Content-Type yourself
      if (input.current) input.current.value = "";
      setMessage("Main image updated.");
      await onUploaded();
    } catch (error) {
      setMessage(apiError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="main-image-upload">
      <h3>Main image (admin only)</h3>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" />
      <button className="primary" disabled={busy}>
        {busy ? "Uploading…" : "Set main image"}
      </button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
