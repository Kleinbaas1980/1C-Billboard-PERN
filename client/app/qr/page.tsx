"use client";
import { useEffect, useState } from "react";
import { api } from "@/services/http";
import { useAuth } from "@/contexts/auth-context";
import PhotoUploadGate from "../photo-upload-gate";
export default function QRPage() {
  const { user } = useAuth();
  const [row, setRow] = useState<{
      id: string;
      company: string;
      advertiser: string;
      hasMainImage: boolean;
    } | null>(null),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("asset") || "";
    api
      .get("/public/assets/" + encodeURIComponent(id))
      .then((r) => setRow(r.data))
      .catch(() => setRow(null))
      .finally(() => setLoading(false));
  }, []);
  return (
    <main className="qr-public-page">
      <section className="qr-public-card">
        <img src="/1c-logo.png" alt="1C" />
        {loading ? (
          <p>Loading board…</p>
        ) : !row ? (
          <>
            <h1>Asset unavailable</h1>
            <p>This QR label does not link to an active board.</p>
          </>
        ) : (
          <>
            <div className="eyebrow">BILLBOARD ASSET</div>
            <div className="qr-hero">
              <h1 className="qr-public-number">{row.id}</h1>
              {row.hasMainImage && (
                <img
                  className="qr-main-image"
                  src={
                    "/api/public/assets/" +
                    encodeURIComponent(row.id) +
                    "/main-image"
                  }
                  alt={"Billboard " + row.id}
                />
              )}
            </div>
            <dl>
              <div>
                <dt>Owner of asset</dt>
                <dd>{row.company || "Not recorded"}</dd>
              </div>
              <div>
                <dt>Advertiser</dt>
                <dd>{row.advertiser || "Not recorded"}</dd>
              </div>
            </dl>
            {user ? (
              <PhotoUploadGate asset={row.id} />
            ) : (
              <section className="upload-gate">
                <h2>Assessor photo uploads</h2>
                <p>
                  Sign in and enter your admin-issued upload password to add
                  photos.
                </p>
                <a
                  className="button primary"
                  href={
                    "/login?next=" + encodeURIComponent("/qr?asset=" + row.id)
                  }
                >
                  Assessor sign in
                </a>
              </section>
            )}
          </>
        )}
      </section>
    </main>
  );
}
