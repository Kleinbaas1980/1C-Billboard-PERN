import { Home, ScanLine } from "lucide-react";
import React, { SetStateAction } from "react";

interface HeaderProps {
  setScan: (value: SetStateAction<boolean>) => void;
}

export default function Header({ setScan }: HeaderProps) {
  return (
    <header className="topbar no-print">
      <span>
        ASSET MANAGEMENT <span className="slash">/</span> BILLBOARDS
      </span>
      <div className="topbar-actions">
        <a className="button" href="/">
          <Home size={18} />
          Home
        </a>
        <button onClick={() => setScan(true)}>
          <ScanLine size={18} />
          Scan QR code
        </button>
      </div>
    </header>
  );
}
