import { Asset } from "@/app/asset-workspace";
import { Plus } from "lucide-react";
import React, { SetStateAction } from "react";

interface PageHeaderProps {
  view: string;
  user: {
    name: string;
    email: string;
    role: string;
  };
  downloadRegister(): Promise<void>;
  setCreating: (value: SetStateAction<boolean>) => void;
  setEdit: (value: SetStateAction<Asset | null>) => void;
  blank: () => Asset;
  setSelected: (value: SetStateAction<Asset | null>) => void;
  setError: (value: SetStateAction<string>) => void;
}

export default function PageHeader({
  view,
  user,
  downloadRegister,
  setCreating,
  setEdit,
  blank,
  setSelected,
  setError,
}: PageHeaderProps) {
  return (
    <div className="page-heading no-print">
      <div>
        <div className="eyebrow">YOUR BILLBOARD PORTFOLIO</div>
        <h1>
          {view === "dashboard" ? "Dashboard" : "Asset register"}
          <span>.</span>
        </h1>
        <p>Site records, advertisers and maintenance in one place.</p>
      </div>
      {user.role === "admin" && (
        <button
          onClick={() => downloadRegister().catch((e) => setError(e.message))}
        >
          Download Excel register
        </button>
      )}
      <button
        className="primary"
        onClick={() => {
          setCreating(true);
          setEdit(blank());
          setSelected(null);
          setError("");
        }}
      >
        <Plus size={20} />
        Register asset
      </button>
    </div>
  );
}
