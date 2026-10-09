import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { pool, transaction } from "../configs/database.js";
import { hashPassword } from "../utils/crypto.js";
import { emailSchema, passwordSchema } from "../utils/validation.js";
import { HttpError } from "../utils/errors.js";
export async function list(_req: Request, res: Response) {
  res.json(
    (
      await pool.query(
        "SELECT id,email,name,role,is_owner AS owner FROM users WHERE active ORDER BY name",
      )
    ).rows,
  );
}
export async function save(req: Request, res: Response) {
  const a = z
    .object({
      email: emailSchema,
      name: z.string().trim().min(1).max(200),
      role: z.enum(["admin", "assessor"]),
      password: passwordSchema.optional(),
    })
    .parse(req.body);
  const hash = a.password ? await hashPassword(a.password) : null;
  await transaction(async (c) => {
    const existing = (
      await c.query("SELECT * FROM users WHERE email=$1 FOR UPDATE", [a.email])
    ).rows[0];
    if (existing?.is_owner && a.role !== "admin")
      throw new HttpError(409, "The owner must remain an admin.");
    if (!existing && !hash)
      throw new HttpError(400, "An initial password is required.");
    if (existing) {
      await c.query(
        "UPDATE users SET name=$2,role=$3,password_hash=COALESCE($4,password_hash),active=true,updated_at=now() WHERE id=$1",
        [existing.id, a.name, a.role, hash],
      );
      if (hash)
        await c.query("UPDATE sessions SET revoked_at=now() WHERE user_id=$1", [
          existing.id,
        ]);
    } else
      await c.query(
        "INSERT INTO users(id,email,name,role,password_hash) VALUES($1,$2,$3,$4,$5)",
        [randomUUID(), a.email, a.name, a.role, hash],
      );
    await c.query(
      "INSERT INTO audit_logs(actor_id,action,entity_id) VALUES($1,$2,$3)",
      [req.user!.id, "member.save", a.email],
    );
  });
  res.json({ ok: true });
}
export async function deactivate(req: Request, res: Response) {
  const email = emailSchema.parse(req.body.email);
  await transaction(async (c) => {
    const u = (
      await c.query("SELECT id,is_owner FROM users WHERE email=$1 FOR UPDATE", [
        email,
      ])
    ).rows[0];
    if (!u) throw new HttpError(404, "Member unavailable.");
    if (u.is_owner || u.id === req.user!.id)
      throw new HttpError(
        409,
        "The owner and your own account cannot be deactivated.",
      );
    await c.query(
      "UPDATE users SET active=false,upload_version=upload_version+1 WHERE id=$1",
      [u.id],
    );
    await c.query("UPDATE sessions SET revoked_at=now() WHERE user_id=$1", [
      u.id,
    ]);
    await c.query(
      "INSERT INTO audit_logs(actor_id,action,entity_id) VALUES($1,$2,$3)",
      [req.user!.id, "member.deactivate", u.id],
    );
  });
  res.json({ ok: true });
}
export async function uploadPassword(req: Request, res: Response) {
  const a = z
    .object({ email: emailSchema, password: passwordSchema })
    .parse(req.body);
  const hash = await hashPassword(a.password);
  const result = await pool.query(
    "UPDATE users SET upload_password_hash=$2,upload_version=upload_version+1 WHERE email=$1 AND active",
    [a.email, hash],
  );
  if (!result.rowCount) throw new HttpError(404, "Member unavailable.");
  res.json({ ok: true });
}
