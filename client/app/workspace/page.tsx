"use client";
import AssetWorkspace from "../asset-workspace";
import { RequireAuth, useAuth } from "@/contexts/auth-context";
export default function Workspace() {
  const { user } = useAuth();
  return <RequireAuth>{user && <AssetWorkspace user={user} />}</RequireAuth>;
}
