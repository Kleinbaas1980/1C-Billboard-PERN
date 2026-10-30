import { Asset } from "@/app/asset-workspace";
import React, { SetStateAction } from "react";

interface MobileNav {
  setView: (value: SetStateAction<string>) => void;
  setSelected: (value: SetStateAction<Asset | null>) => void;
  setEdit: (value: SetStateAction<Asset | null>) => void;
  user: {
    name: string;
    email: string;
    role: string;
  };
}

export default function MobileNav({
  setView,
  setSelected,
  setEdit,
  user,
}: MobileNav) {
  return (
    <div className="mobile-nav no-print">
      <button
        onClick={() => {
          setView("dashboard");
          setSelected(null);
          setEdit(null);
        }}
      >
        Dashboard
      </button>
      <button
        onClick={() => {
          setView("register");
          setSelected(null);
          setEdit(null);
        }}
      >
        Assets
      </button>
      <a className="button" href="/report">
        Report
      </a>
      {user.role === "admin" && (
        <a className="button" href="/admin">
          Team
        </a>
      )}
      <a className="button" href="/login">
        Account
      </a>
    </div>
  );
}
