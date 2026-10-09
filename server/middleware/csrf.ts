import type { Request, Response, NextFunction } from "express";
import { HttpError } from "../utils/errors.js";
import { env } from "../configs/env.js";
import { safeEqual, validCsrf } from "../utils/crypto.js";
export function csrf(req: Request, _res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    next();
    return;
  }
  if (req.get("origin") !== env.CLIENT_ORIGIN) {
    next(new HttpError(403, "Invalid request origin."));
    return;
  }
  const cookie = req.cookies?.bc_csrf,
    header = req.get("x-csrf-token");
  if (
    typeof cookie !== "string" ||
    !header ||
    !safeEqual(cookie, header) ||
    !validCsrf(cookie, env.CSRF_SECRET)
  ) {
    next(new HttpError(403, "Invalid CSRF token."));
    return;
  }
  next();
}
