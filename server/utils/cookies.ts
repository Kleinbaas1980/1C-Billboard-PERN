import type { CookieOptions, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../configs/env.js";
export const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};
export function setSessionCookies(
  res: Response,
  userId: string,
  sessionId: string,
  refresh: string,
) {
  const access = jwt.sign({ sid: sessionId }, env.JWT_SECRET, {
    algorithm: "HS256",
    subject: userId,
    issuer: "1c-billboards",
    audience: "1c-client",
    expiresIn: "15m",
  });
  res.cookie("bc_access", access, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
  res.cookie("bc_refresh", refresh, { ...cookieOptions, maxAge: 7 * 86400000 });
}
export function clearSessionCookies(res: Response) {
  for (const name of ["bc_access", "bc_refresh", "bc_upload"])
    res.clearCookie(name, cookieOptions);
}
