import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { put, get, del } from "@vercel/blob";
import sharp from "sharp";
import { z } from "zod";
import { pool, transaction } from "../configs/database.js";
import { env } from "../configs/env.js";
import { cookieOptions } from "../utils/cookies.js";
import { randomToken, tokenHash, verifyPassword } from "../utils/crypto.js";
import { HttpError } from "../utils/errors.js";
import { consumeAttempt } from "../models/rate-limit.model.js";

async function grant(req: Request, asset: string) {
  const token = req.cookies.bc_upload;
  if (typeof token !== "string") return false;
  return !!(
    await pool.query(
      "SELECT 1 FROM upload_grants g JOIN users u ON u.id=g.user_id JOIN assets a ON a.id=g.asset_id WHERE g.token_hash=$1 AND g.user_id=$2 AND g.session_id=$3 AND g.asset_id=$4 AND g.expires_at>now() AND g.upload_version=u.upload_version AND a.deleted_at IS NULL",
      [tokenHash(token), req.user!.id, req.user!.sessionId, asset],
    )
  ).rowCount;
}

export async function unlocked(req: Request, res: Response) {
  res.json({ unlocked: await grant(req, String(req.query.asset)) });
}

export async function unlock(req: Request, res: Response) {
  const asset = String(req.body.asset || "");
  const password = String(req.body.password || "");
  if (password.length > 128) throw new HttpError(400, "Invalid password.");
  await consumeAttempt("upload:" + req.user!.id, 10, 900);
  const u = (
    await pool.query(
      "SELECT upload_password_hash,upload_version FROM users WHERE id=$1",
      [req.user!.id],
    )
  ).rows[0];
  if (
    !u.upload_password_hash ||
    !(await verifyPassword(password, u.upload_password_hash))
  )
    throw new HttpError(
      403,
      "Upload password is incorrect or has not been set by admin.",
    );
  if (
    !(
      await pool.query(
        "SELECT 1 FROM assets WHERE id=$1 AND deleted_at IS NULL",
        [asset],
      )
    ).rowCount
  )
    throw new HttpError(404, "Asset unavailable.");
  const token = randomToken();
  await pool.query(
    "INSERT INTO upload_grants(token_hash,user_id,session_id,asset_id,upload_version,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '30 minutes')",
    [
      tokenHash(token),
      req.user!.id,
      req.user!.sessionId,
      asset,
      u.upload_version,
    ],
  );
  res.cookie("bc_upload", token, { ...cookieOptions, maxAge: 1800000 });
  res.json({ ok: true });
}

export async function upload(req: Request, res: Response) {
  const asset = String(req.body.asset || "");
  if (!(await grant(req, asset)))
    throw new HttpError(403, "Unlock photo uploads for this asset first.");
  if (!req.file) throw new HttpError(400, "Select a photo.");
  await consumeAttempt("photo:" + req.user!.id, 100, 3600);
  let bytes: Buffer;
  try {
    const metadata = await sharp(req.file.buffer, {
      limitInputPixels: 40000000,
    }).metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format || "")) throw Error();
    bytes = await sharp(req.file.buffer, { limitInputPixels: 40000000 })
      .rotate()
      .resize({
        width: 2400,
        height: 2400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch {
    throw new HttpError(
      400,
      "Use a valid JPG, PNG or WebP photo, up to 40 megapixels.",
    );
  }
  const id = randomUUID();
  const blob = await put("assets/" + asset + "/" + id + ".jpg", bytes, {
    access: "private",
    contentType: "image/jpeg",
    token: env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
  });
  try {
    await transaction(async (c) => {
      const a = await c.query(
        "SELECT id FROM assets WHERE id=$1 AND deleted_at IS NULL FOR UPDATE",
        [asset],
      );
      if (!a.rowCount) throw new HttpError(404, "Asset unavailable.");
      await c.query(
        "INSERT INTO photos(id,asset_id,name,blob_url,blob_path,content_type,size_bytes,uploaded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
        [
          id,
          asset,
          req.file!.originalname.slice(0, 200),
          blob.url,
          blob.pathname,
          "image/jpeg",
          bytes.length,
          req.user!.id,
        ],
      );
    });
  } catch (error) {
    try {
      await del(blob.url, { token: env.BLOB_READ_WRITE_TOKEN });
    } catch {
      await pool.query(
        "INSERT INTO blob_cleanup_jobs(id,blob_url) VALUES($1,$2)",
        [randomUUID(), blob.url],
      );
    }
    throw error;
  }
  res.status(201).json({ id });
}

export async function read(req: Request, res: Response, next: NextFunction) {
  z.uuid().parse(req.params.id);
  const p = (
    await pool.query(
      "SELECT p.blob_path FROM photos p JOIN assets a ON a.id=p.asset_id WHERE p.id=$1 AND a.deleted_at IS NULL",
      [req.params.id],
    )
  ).rows[0];
  if (!p) throw new HttpError(404, "Photo unavailable.");
  const blob = await get(p.blob_path, {
    access: "private",
    token: env.BLOB_READ_WRITE_TOKEN,
  });
  if (!blob || blob.statusCode !== 200)
    throw new HttpError(404, "Photo unavailable.");
  res.set({
    "Content-Type": "image/jpeg",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  Readable.fromWeb(blob.stream as import("node:stream/web").ReadableStream)
    .on("error", next)
    .pipe(res);
}

export async function remove(req: Request, res: Response) {
  z.uuid().parse(req.params.id);
  await transaction(async (c) => {
    const existing = (
      await c.query("SELECT is_main FROM photos WHERE id=$1 FOR UPDATE", [
        req.params.id,
      ])
    ).rows[0];
    if (!existing) throw new HttpError(404, "Photo unavailable.");

    if (existing.is_main) {
      const role = (
        await c.query("SELECT role FROM users WHERE id=$1", [req.user!.id])
      ).rows[0]?.role;
      if (role !== "admin")
        throw new HttpError(403, "Only an admin can remove the main image.");
    }

    const p = (
      await c.query("DELETE FROM photos WHERE id=$1 RETURNING blob_url", [
        req.params.id,
      ])
    ).rows[0];
    await c.query("INSERT INTO blob_cleanup_jobs(id,blob_url) VALUES($1,$2)", [
      randomUUID(),
      p.blob_url,
    ]);
    await c.query(
      "INSERT INTO audit_logs(actor_id,action,entity_id) VALUES($1,$2,$3)",
      [req.user!.id, "photo.delete", String(req.params.id)],
    );
  });
  res.json({ ok: true });
}

const assetIdSchema = z.string().regex(/^[A-Z0-9-]{1,40}$/);

async function toJpeg(input: Buffer): Promise<Buffer> {
  try {
    const opts = { limitInputPixels: 40000000 };
    const metadata = await sharp(input, opts).metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format || ""))
      throw new Error();
    return await sharp(input, opts)
      .rotate()
      .resize({
        width: 2400,
        height: 2400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer(); // `return await` so the catch below sees failures
  } catch {
    throw new HttpError(
      400,
      "Use a valid JPG, PNG or WebP photo, up to 40 megapixels.",
    );
  }
}

export async function mainImage(req: Request, res: Response) {
  const parsed = assetIdSchema.safeParse(req.body.asset);
  if (!parsed.success) throw new HttpError(400, "Invalid asset.");
  const asset = parsed.data;

  if (!req.file) throw new HttpError(400, "Select a photo.");
  await consumeAttempt("main-photo:" + req.user!.id, 20, 3600);

  const exists = await pool.query(
    "SELECT 1 FROM assets WHERE id=$1 AND deleted_at IS NULL",
    [asset],
  );
  if (!exists.rowCount) throw new HttpError(404, "Asset unavailable.");

  const bytes = await toJpeg(req.file.buffer);

  const id = randomUUID();
  const blob = await put("assets/" + asset + "/main-" + id + ".jpg", bytes, {
    access: "private",
    contentType: "image/jpeg",
    token: env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
  });

  try {
    await transaction(async (c) => {
      const a = await c.query(
        "SELECT id FROM assets WHERE id=$1 AND deleted_at IS NULL FOR UPDATE",
        [asset],
      );
      if (!a.rowCount) throw new HttpError(404, "Asset unavailable.");

      await c.query(
        "UPDATE photos SET is_main=false WHERE asset_id=$1 AND is_main",
        [asset],
      );
      await c.query(
        "INSERT INTO photos(id,asset_id,name,blob_url,blob_path,content_type,size_bytes,uploaded_by,is_main) VALUES($1,$2,$3,$4,$5,$6,$7,$8,true)",
        [
          id,
          asset,
          req.file!.originalname.slice(0, 200),
          blob.url,
          blob.pathname,
          "image/jpeg",
          bytes.length,
          req.user!.id,
        ],
      );
      await c.query(
        "INSERT INTO audit_logs(actor_id,action,entity_id) VALUES($1,$2,$3)",
        [req.user!.id, "photo.main_set", asset],
      );
    });
  } catch (error) {
    try {
      await del(blob.url, { token: env.BLOB_READ_WRITE_TOKEN });
    } catch {
      await pool.query(
        "INSERT INTO blob_cleanup_jobs(id,blob_url) VALUES($1,$2)",
        [randomUUID(), blob.url],
      );
    }
    throw error;
  }

  res.status(201).json({ id });
}
