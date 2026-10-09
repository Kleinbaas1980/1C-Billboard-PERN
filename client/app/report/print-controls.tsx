"use client";
import { useEffect, useState } from "react";
export default function PrintControls() {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    const images = Array.from(document.querySelectorAll(".report img"));
    Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            const el = img as HTMLImageElement;
            const done = () => {
              if (!el.naturalWidth) setFailed(true);
              resolve();
            };
            if (el.complete) done();
            else {
              el.addEventListener("load", done, { once: true });
              el.addEventListener("error", done, { once: true });
            }
          }),
      ),
    ).then(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);
  return (
    <div className="report-controls no-print">
      <a className="button" href="/">
        Home
      </a>
      <a className="button" href="/workspace">
        Back to dashboard
      </a>
      <button
        className="primary"
        disabled={!ready}
        onClick={() => window.print()}
      >
        {ready ? "Print / save PDF" : "Loading report photos…"}
      </button>
      {failed && (
        <span role="alert">
          Some photos could not load. Reload before printing.
        </span>
      )}
    </div>
  );
}
