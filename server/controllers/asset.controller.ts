import type { Request, Response } from "express";
import { pool, transaction } from "../configs/database.js";
import { listAssets } from "../models/asset.model.js";
import { assetSchema, ratingSchema } from "../utils/validation.js";
import { HttpError } from "../utils/errors.js";
import { assetRegisterXlsx } from "../utils/asset-register-export.js";
import { env } from "../configs/env.js";
export async function list(_req: Request, res: Response) {
  res.json(await listAssets());
}
export async function publicAsset(req: Request, res: Response) {
  const id = String(req.params.id);
  if (!/^[A-Z0-9-]{1,40}$/.test(id))
    throw new HttpError(404, "Asset not found.");
  const { rows } = await pool.query(
    "SELECT id,company,advertiser FROM assets WHERE id=$1 AND deleted_at IS NULL",
    [id],
  );
  if (!rows[0]) throw new HttpError(404, "Asset unavailable.");
  res.json(rows[0]);
}
export async function save(req: Request, res: Response) {
  const a = assetSchema.parse(req.body);
  await transaction(async (c) => {
    const values = [
      a.id,
      a.location,
      a.company,
      a.advertiser,
      a.contact,
      a.email,
      a.phone,
      a.gps,
      a.last || null,
      a.next || null,
      a.comments,
      a.condition,
      a.priority,
      a.maintenanceType,
      req.user!.id,
    ];
    if (a.mode === "create") {
      await c.query(
        "INSERT INTO assets(id,location,company,advertiser,contact,email,phone,gps,last_maintenance,next_maintenance,comments,condition,priority,maintenance_type,assessed_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)",
        values,
      );
    } else {
      const r = await c.query(
        "UPDATE assets SET location=$2,company=$3,advertiser=$4,contact=$5,email=$6,phone=$7,gps=$8,last_maintenance=$9,next_maintenance=$10,comments=$11,condition=$12,priority=$13,maintenance_type=$14,assessed_by=$15,updated_at=now() WHERE id=$1 AND deleted_at IS NULL",
        values,
      );
      if (!r.rowCount) throw new HttpError(404, "Asset unavailable.");
    }
    await c.query(
      "INSERT INTO audit_logs(actor_id,action,entity_id) VALUES($1,$2,$3)",
      [req.user!.id, "asset." + a.mode, a.id],
    );
  });
  res.json({ ok: true });
}
export async function ratings(req: Request, res: Response) {
  const a = ratingSchema.parse(req.body);
  const r = await pool.query(
    "UPDATE assets SET condition=$2,priority=$3,assessed_by=$4,updated_at=now() WHERE id=$1 AND deleted_at IS NULL",
    [a.id, a.condition, a.priority, req.user!.id],
  );
  if (!r.rowCount) throw new HttpError(404, "Asset unavailable.");
  res.json({ ok: true });
}
export async function excel(_req: Request, res: Response) {
  const assets = await listAssets();
  const photos = assets.flatMap((a) => a.photos);
  const bytes = assetRegisterXlsx(assets, photos, env.CLIENT_ORIGIN);
  res
    .type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    .attachment("1C-Asset-Register.xlsx")
    .send(Buffer.from(bytes));
}
