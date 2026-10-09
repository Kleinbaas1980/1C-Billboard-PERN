import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { pool, transaction } from "../configs/database.js";
import { HttpError } from "../utils/errors.js";
export async function list(_req: Request, res: Response) {
  res.json(
    (
      await pool.query(
        `SELECT d.*,u.email AS requested_by,u.name AS requester_name,r.email AS reviewed_by,json_build_object('location',a.location)::text AS asset_data FROM deletion_requests d JOIN users u ON u.id=d.requested_by_id JOIN assets a ON a.id=d.asset_id LEFT JOIN users r ON r.id=d.reviewed_by_id ORDER BY d.created_at DESC`,
      )
    ).rows,
  );
}
export async function request(req: Request, res: Response) {
  const a = z
    .object({
      assetId: z.string().regex(/^[A-Z0-9-]{1,40}$/),
      reason: z.string().trim().min(1).max(2000),
    })
    .parse(req.body);
  await transaction(async (c) => {
    if (
      !(
        await c.query(
          "SELECT id FROM assets WHERE id=$1 AND deleted_at IS NULL FOR UPDATE",
          [a.assetId],
        )
      ).rowCount
    )
      throw new HttpError(404, "Asset unavailable.");
    await c.query(
      "INSERT INTO deletion_requests(id,asset_id,requested_by_id,reason) VALUES($1,$2,$3,$4)",
      [randomUUID(), a.assetId, req.user!.id, a.reason],
    );
  });
  res.status(201).json({ ok: true });
}
export async function review(req: Request, res: Response) {
  const a = z
    .object({ id: z.uuid(), decision: z.enum(["approved", "rejected"]) })
    .parse(req.body);
  await transaction(async (c) => {
    const d = (
      await c.query("SELECT * FROM deletion_requests WHERE id=$1 FOR UPDATE", [
        a.id,
      ])
    ).rows[0];
    if (!d) throw new HttpError(404, "Request unavailable.");
    if (d.status !== "pending")
      throw new HttpError(409, "Request was already reviewed.");
    if (a.decision === "approved") {
      await c.query(
        "UPDATE assets SET deleted_at=now(),updated_at=now() WHERE id=$1",
        [d.asset_id],
      );
      await c.query("DELETE FROM upload_grants WHERE asset_id=$1", [
        d.asset_id,
      ]);
    }
    await c.query(
      "UPDATE deletion_requests SET status=$2,reviewed_by_id=$3,reviewed_at=now() WHERE id=$1",
      [a.id, a.decision, req.user!.id],
    );
    await c.query(
      "INSERT INTO audit_logs(actor_id,action,entity_id) VALUES($1,$2,$3)",
      [req.user!.id, "asset.deletion." + a.decision, d.asset_id],
    );
  });
  res.json({ ok: true });
}
