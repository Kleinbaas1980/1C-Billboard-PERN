import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../configs/env.js";
import { pool } from "../configs/database.js";
import { HttpError } from "../utils/errors.js";
import type { AuthUser, Role } from "../types/index.js";

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const token = req.cookies?.bc_access;
    if (!token) throw new HttpError(401, "Sign in to continue.");
    let payload: jwt.JwtPayload;
    try {
      const result = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ["HS256"],
        issuer: "1c-billboards",
        audience: "1c-client",
      });
      if (typeof result === "string") throw Error();
      payload = result;
    } catch {
      throw new HttpError(401, "Your session has expired.");
    }
    if (
      typeof payload.sub !== "string" ||
      typeof payload.sid !== "string" ||
      !/^[0-9a-f-]{36}$/.test(payload.sub) ||
      !/^[0-9a-f-]{36}$/.test(payload.sid)
    )
      throw new HttpError(401, "Invalid session.");
    const { rows } = await pool.query<AuthUser>(
      `SELECT u.id,u.email,u.name,u.role,u.is_owner,s.id AS "sessionId" FROM users u JOIN sessions s ON s.user_id=u.id WHERE u.id=$1 AND s.id=$2 AND u.active AND s.revoked_at IS NULL AND s.expires_at>now()`,
      [payload.sub, payload.sid],
    );
    if (!rows[0]) throw new HttpError(401, "Sign in to continue.");
    req.user = rows[0];
    req.userId = rows[0].id;
    next();
  } catch (e) {
    next(e);
  }
}

export function roles(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      next(new HttpError(403, "Admin access is required."));
      return;
    }
    next();
  };
}
