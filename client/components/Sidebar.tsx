import { Asset } from "@/app/asset-workspace";
import {
  ClipboardList,
  FileText,
  LayoutDashboard,
  QrCode,
  ScanLine,
  Users,
} from "lucide-react";
import React, { SetStateAction } from "react";

interface SidebarInterface {
  view: string;
  setView: (value: SetStateAction<string>) => void;
  setSelected: (value: SetStateAction<Asset | null>) => void;
  setEdit: (value: SetStateAction<Asset | null>) => void;
  user: {
    name: string;
    email: string;
    role: string;
  };
  setScan: (value: SetStateAction<boolean>) => void;
  setScanError: (value: SetStateAction<string>) => void;
}

export default function Sidebar({
  view,
  setView,
  setSelected,
  setEdit,
  user,
  setScan,
  setScanError,
}: SidebarInterface) {
  return (
    <aside className="sidebar no-print">
      <div className="brand">
        <img src="/1c-logo.png" alt="1C" />
      </div>
      <div className="division">OUTDOOR ADVERTISING</div>
      <button
        className={"nav " + (view === "dashboard" ? "active" : "")}
        onClick={() => {
          setView("dashboard");
          setSelected(null);
          setEdit(null);
          history.replaceState(null, "", "/workspace");
        }}
      >
        <LayoutDashboard size={20} />
        Dashboard
      </button>
      <button
        className={"nav " + (view === "register" ? "active" : "")}
        onClick={() => {
          setView("register");
          setSelected(null);
          setEdit(null);
          history.replaceState(null, "", "/workspace");
        }}
      >
        <ClipboardList size={20} />
        Asset register
      </button>
      <a className="nav" href="/report">
        <FileText size={20} />
        All assets summary
      </a>
      {user.role === "admin" && (
        <a className="nav" href="/admin">
          <Users size={20} />
          Manage assessors
        </a>
      )}
      <button
        className="nav"
        onClick={() => {
          setScan(true);
          setScanError("");
        }}
      >
        <ScanLine size={20} />
        Scan an asset
      </button>
      <div className="side-note">
        <QrCode size={32} />
        <b>Every asset. One record.</b>
        <p>Register on site, attach a label and keep maintenance up to date.</p>
      </div>
      <footer>
        <b>{user.name}</b>
        <br />
        {user.role === "admin" ? "Admin" : "Assessor"}
        <br />
        <a href="/login">Account / sign out</a>
      </footer>
    </aside>
  );
}
