"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, Printer } from "lucide-react";
import { Asset } from "@/app/asset-workspace";

export function Label({ asset }: { asset: Asset }) {
  const [qr, setQr] = useState("");
  const [qrError, setQrError] = useState("");
  useEffect(() => {
    setQr("");
    setQrError("");
    QRCode.toDataURL(
      location.origin + "/qr?asset=" + encodeURIComponent(asset.id),
      { width: 900, margin: 4, errorCorrectionLevel: "M" },
    )
      .then(setQr)
      .catch(() =>
        setQrError(
          "Unable to generate the QR code. Reopen this label to try again.",
        ),
      );
  }, [asset.id]);
  function download() {
    const a = document.createElement("a");
    a.href = qr;
    a.download = asset.id + "-QR.png";
    a.click();
  }
  return (
    <>
      <div className="label qr-label" id="print-label">
        <img className="label-logo" src="/1c-logo.png" alt="1C" />
        <strong>{asset.company}</strong>
        {qrError && <p role="alert">{qrError}</p>}
        {qr ? (
          <img className="asset-qr" src={qr} alt={"QR code for " + asset.id} />
        ) : (
          !qrError && <p>Generating QR code…</p>
        )}
        <b className="label-asset-id">{asset.id}</b>
        <p>{asset.location}</p>
        <small>
          Scan to confirm this board and view its maintenance record
        </small>
      </div>
      <div className="actions no-print">
        <button disabled={!qr} onClick={() => window.print()}>
          <Printer size={17} />
          Print QR label
        </button>
        <button disabled={!qr} onClick={download}>
          <Download size={17} />
          Download QR code
        </button>
      </div>
    </>
  );
}
