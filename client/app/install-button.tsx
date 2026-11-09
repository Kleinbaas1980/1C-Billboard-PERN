// Not using this

"use client";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";

export default function InstallButton() {
  const [evt, setEvt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  // iOS Safari never fires beforeinstallprompt, so show instructions instead
  if (isIos && !evt)
    return (
      <button
        onClick={() =>
          alert(
            "To install: tap the Share icon in Safari, then 'Add to Home Screen'.",
          )
        }
      >
        <Download size={18} /> Install app
      </button>
    );

  if (!evt) return null;
  return (
    <button
      onClick={async () => {
        await evt.prompt();
        setEvt(null);
      }}
    >
      <Download size={18} /> Install app
    </button>
  );
}
