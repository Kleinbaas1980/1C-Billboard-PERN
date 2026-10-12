import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { pool, transaction } from "../configs/database.js";
import { env } from "../configs/env.js";
import { findUserByEmail, publicUser } from "../models/user.model.js";
import { consumeAttempt } from "../models/rate-limit.model.js";
import {
  hashPassword,
  verifyPassword,
  randomToken,
  tokenHash,
  signCsrf,
} from "../utils/crypto.js";
import {
  cookieOptions,
  setSessionCookies,
  clearSessionCookies,
} from "../utils/cookies.js";
import { emailSchema, passwordSchema } from "../utils/validation.js";
import { HttpError } from "../utils/errors.js";
import { UserRow } from "../types/index.js";
import { sendTokenEmail } from "../services/mail.service.js";

async function emailToken(user: UserRow, purpose: "verify" | "reset") {
  const token = randomToken();
  await transaction(async (db) => {
    await db.query(
      "UPDATE auth_tokens SET used_at=now() WHERE user_id=$1 AND purpose=$2 AND used_at IS NULL",
      [user.id, purpose],
    );

    await db.query(
      "INSERT INTO auth_tokens(id,user_id,purpose,token_hash,expires_at) VALUES($1, $2, $3, $4, now()+($5 * interval '1 minute'))",
      [
        randomUUID(),
        user.id,
        purpose,
        tokenHash(token),
        purpose === "verify" ? 1440 : 30,
      ],
    );
  });

  try {
    await sendTokenEmail(user.email, token, purpose);
  } catch (error) {
    console.log(error);
    throw new HttpError(503, "Reset/Verify Email failed. Please try again.");
  }
}

export async function csrfToken(_req: Request, res: Response) {
  const token = signCsrf(randomToken(), env.CSRF_SECRET);
  res.cookie("bc_csrf", token, {
    ...cookieOptions,
    httpOnly: false,
    maxAge: 86400000,
  });
  res.set("Cache-Control", "no-store").json({ token });
}

export async function login(req: Request, res: Response) {
  const { email, password } = z
    .object({ email: emailSchema, password: z.string().min(1).max(128) })
    .parse(req.body);
  await consumeAttempt("login:" + tokenHash(email), 10, 900);
  const u = await findUserByEmail(email);
  const fallback = "scrypt$" + "0".repeat(32) + "$" + "0".repeat(128);
  const valid = await verifyPassword(password, u?.password_hash || fallback);
  if (!u || !u.active || !valid)
    throw new HttpError(401, "Incorrect email or password.");
  const sid = randomUUID(),
    refresh = randomToken();
  await pool.query(
    "INSERT INTO sessions(id,user_id,refresh_hash,csrf_nonce,expires_at) VALUES($1,$2,$3,$4,now()+interval '7 days')",
    [sid, u.id, tokenHash(refresh), randomToken()],
  );
  await pool.query("INSERT INTO audit_logs(actor_id,action) VALUES($1,$2)", [
    u.id,
    "auth.login",
  ]);
  setSessionCookies(res, u.id, sid, refresh);
  res.json({ user: publicUser(u) });
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.bc_refresh;
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token))
    throw new HttpError(401, "Sign in again.");
  const nextToken = randomToken();
  const result = await transaction(async (c) => {
    const { rows } = await c.query(
      `SELECT s.id AS session_id,u.id,u.email,u.name,u.role,u.is_owner FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.refresh_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now() AND u.active FOR UPDATE OF s`,
      [tokenHash(token)],
    );
    const u = rows[0];
    if (!u) throw new HttpError(401, "Sign in again.");
    await c.query("UPDATE sessions SET refresh_hash=$1 WHERE id=$2", [
      tokenHash(nextToken),
      u.session_id,
    ]);
    return u;
  });
  setSessionCookies(res, result.id, result.session_id, nextToken);
  res.json({ user: publicUser(result) });
}

export function me(req: Request, res: Response) {
  res.json({ user: publicUser(req.user!) });
}

export async function logout(req: Request, res: Response) {
  const token = req.cookies?.bc_refresh;
  if (typeof token === "string")
    await pool.query(
      "UPDATE sessions SET revoked_at=now() WHERE refresh_hash=$1",
      [tokenHash(token)],
    );
  clearSessionCookies(res);
  res.json({ ok: true });
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = z
    .object({
      currentPassword: z.string().min(1).max(128),
      newPassword: passwordSchema,
    })
    .parse(req.body);
  const u = await findUserByEmail(req.user!.email);
  if (!u || !(await verifyPassword(currentPassword, u.password_hash)))
    throw new HttpError(403, "Incorrect current password.");
  const hash = await hashPassword(newPassword);
  await transaction(async (c) => {
    await c.query(
      "UPDATE users SET password_hash=$1,updated_at=now() WHERE id=$2",
      [hash, u.id],
    );
    await c.query("UPDATE sessions SET revoked_at=now() WHERE user_id=$1", [
      u.id,
    ]);
    await c.query("INSERT INTO audit_logs(actor_id,action) VALUES($1,$2)", [
      u.id,
      "auth.password_changed",
    ]);
  });
  clearSessionCookies(res);
  res.json({ ok: true });
}

export async function forgot(req: Request, res: Response) {
  const { email } = req.validate as { email: string };
  const user = await pool.query<UserRow>(
    "SELECT * FROM USERS WHERE email = $1",
    [email],
  );

  if (!user.rows[0]?.email) {
    return res.status(404).json({ error: "Email not found!" });
  } else {
    await emailToken(user.rows[0], "reset");
    res
      .status(202)
      .json({ message: "A password reset link has been sent to your email." });
  }
}

export async function reset(req: Request, res: Response) {
  const { token, password } = req.validate as {
    token: string;
    password: string;
  };
  console.log(password);
  const passwordHash = await hashPassword(password);

  await transaction(async (db) => {
    const row = (
      await db.query(
        "SELECT * FROM auth_tokens WHERE token_hash=$1 AND purpose='reset' AND used_at IS NULL AND expires_at>now() FOR UPDATE",
        [tokenHash(token)],
      )
    ).rows[0];
    if (!row)
      throw new HttpError(
        400,
        "This password reset link is invalid or expired.",
      );
    await db.query("UPDATE users SET password_hash=$1 WHERE id=$2", [
      passwordHash,
      row.user_id,
    ]);
    await db.query(
      "UPDATE auth_tokens SET used_at=now() WHERE user_id=$1 AND purpose='reset' AND used_at IS NULL",
      [row.user_id],
    );
    // await db.query(
    //   "UPDATE auth_sessions SET revoked_at=now() WHERE user_id=$1",
    //   [row.user_id],
    // );
  });

  return res
    .status(200)
    .json({ message: "Password changed. Sign in with your new password." });
}
