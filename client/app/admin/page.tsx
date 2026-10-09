"use client";
import TeamAdmin from "./team-admin";
import { RequireAuth } from "@/contexts/auth-context";
export default function Admin() {
  return (
    <RequireAuth admin>
      <TeamAdmin />
    </RequireAuth>
  );
}
