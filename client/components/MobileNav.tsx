import { Asset } from "@/app/asset-workspace";
import {
  ClipboardList,
  FileText,
  LayoutDashboard,
  User,
  Users,
} from "lucide-react";
import React, { SetStateAction } from "react";

interface MobileNav {
  view: string;
  setView: (value: SetStateAction<string>) => void;
  setSelected: (value: SetStateAction<Asset | null>) => void;
  setEdit: (value: SetStateAction<Asset | null>) => void;
  user: { name: string; email: string; role: string };
}

export default function MobileNav({
  view,
  setView,
  setSelected,
  setEdit,
  user,
}: MobileNav) {
  const go = (v: string) => {
    setView(v);
    setSelected(null);
    setEdit(null);
    history.replaceState(null, "", "/workspace");
  };

  return (
    <nav className="mobile-nav no-print" aria-label="Main navigation">
      <button
        className={view === "dashboard" ? "active" : ""}
        onClick={() => go("dashboard")}
      >
        <LayoutDashboard size={22} />
        Dashboard
      </button>
      <button
        className={view === "register" ? "active" : ""}
        onClick={() => go("register")}
      >
        <ClipboardList size={22} />
        Assets
      </button>
      <a href="/report">
        <FileText size={22} />
        Report
      </a>
      {user.role === "admin" && (
        <a href="/admin">
          <Users size={22} />
          Team
        </a>
      )}
      <a href="/login">
        <User size={22} />
        Account
      </a>
    </nav>
  );
}
