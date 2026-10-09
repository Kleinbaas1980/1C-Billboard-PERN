import { pool } from "../configs/database.js";
import { HttpError } from "../utils/errors.js";
export async function consumeAttempt(
  key: string,
  max: number,
  seconds: number,
) {
  const { rows } = await pool.query<{ attempts: number }>(
    `INSERT INTO rate_limits(key,window_start,attempts) VALUES($1,now(),1) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN rate_limits.window_start<now()-($2::int*interval '1 second') THEN 1 ELSE rate_limits.attempts+1 END,window_start=CASE WHEN rate_limits.window_start<now()-($2::int*interval '1 second') THEN now() ELSE rate_limits.window_start END RETURNING attempts`,
    [key, seconds],
  );
  if (rows[0].attempts > max)
    throw new HttpError(429, "Too many attempts. Try again later.");
}
