"use client";
import { QrCode, ShieldCheck, ClipboardCheck, Camera } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export default function Launch() {
  const { user } = useAuth();
  return (
    <div className="launch-page">
      <header className="launch-top">
        <a href="/" className="launch-brand">
          <img src="/1c-logo.png" alt="1C" />
        </a>
        <span>OUTDOOR ADVERTISING</span>
        <nav className="launch-top-logins" aria-label="Team access">
          <a href="/login?role=admin">
            <ShieldCheck size={17} />
            Admin login
          </a>
          <a href="/login?role=assessor">
            <ClipboardCheck size={17} />
            Assessor login
          </a>
          {user && (
            <>
              <a href="/login">Account</a>
              <a className="button primary" href="/workspace">
                Open dashboard
              </a>
            </>
          )}
        </nav>
      </header>
      <main className="launch-main">
        <section className="launch-intro">
          <div className="eyebrow">BILLBOARD ASSET MANAGEMENT</div>
          <h1>
            Your boards.
            <br />
            Your maintenance.
            <br />
            <span>One place.</span>
          </h1>
          <p>
            Identify the right board, record its condition and keep your crew
            focused on the work that matters.
          </p>
          <div className="launch-tools">
            <span>
              <QrCode size={19} />
              QR asset labels
            </span>
            <span>
              <ClipboardCheck size={19} />
              Condition & priority
            </span>
            <span>
              <Camera size={19} />
              Site photographs
            </span>
          </div>
        </section>
      </main>
      <footer className="launch-footer">
        <span>1C · Billboard asset management</span>
        <span>Scan. Assess. Maintain.</span>
      </footer>
    </div>
  );
}
