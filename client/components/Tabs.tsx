import { Asset } from "@/app/asset-workspace";
import MainImageUpload from "@/app/main-image-upload";
import PhotoUploadGate from "@/app/photo-upload-gate";
import { apiRequest } from "@/services/http";
import { X } from "lucide-react";
import React, { SetStateAction } from "react";
import { Label } from "./GenerateQr";

interface TabsProps {
  tab: string;
  setTab: (value: SetStateAction<string>) => void;
  selected: Asset;
  user: {
    name: string;
    email: string;
    role: string;
  };
  load(focus?: string): Promise<void>;
  busy: boolean;
  setBusy: (value: SetStateAction<boolean>) => void;
  setError: (value: SetStateAction<string>) => void;
}

export default function Tabs({
  tab,
  setTab,
  selected,
  user,
  load,
  busy,
  setBusy,
  setError,
}: TabsProps) {
  return (
    <>
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
            ...(selected.element === "TV"
              ? [["Tv Serial number", selected.serial_number]]
              : []),
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
                  {(user.role === "admin" || !(p.isMain ?? p.is_main)) && (
                    <button
                      disabled={busy}
                      onClick={async () => {
                        if (!confirm("Remove this photo?")) return;
                        setBusy(true);
                        try {
                          const r = await apiRequest("/api/photos/" + p.id, {
                            method: "DELETE",
                          });
                          if (!r.ok) throw Error("Unable to remove photo");
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
            Print and attach this label to the billboard. Scan the QR code to
            open this board’s separate asset card. Photo uploads require
            assessor sign-in and an upload password.
          </p>
          <Label asset={selected} />
        </div>
      )}
    </>
  );
}
