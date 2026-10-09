import { del } from "@vercel/blob";
import { pool } from "../configs/database.js";
import { env } from "../configs/env.js";
try {
  const jobs = (
    await pool.query(
      "SELECT id,blob_url FROM blob_cleanup_jobs ORDER BY created_at LIMIT 100",
    )
  ).rows;
  for (const job of jobs) {
    try {
      await del(job.blob_url, { token: env.BLOB_READ_WRITE_TOKEN });
      await pool.query("DELETE FROM blob_cleanup_jobs WHERE id=$1", [job.id]);
    } catch {
      await pool.query(
        "UPDATE blob_cleanup_jobs SET attempts=attempts+1,last_error=$2 WHERE id=$1",
        [
          job.id,
          "Blob deletion failed; check storage credentials/connectivity.",
        ],
      );
    }
  }
  await pool.query(
    "DELETE FROM upload_grants WHERE expires_at<now(); DELETE FROM sessions WHERE expires_at<now() AND id NOT IN (SELECT session_id FROM upload_grants); DELETE FROM rate_limits WHERE window_start<now()-interval '1 day'",
  );
} finally {
  await pool.end();
}
