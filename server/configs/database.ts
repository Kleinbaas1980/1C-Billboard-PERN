import pg from "pg";
import { env } from "./env.js";
export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});
export async function transaction<T>(
  work: (client: pg.PoolClient) => Promise<T>,
) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const value = await work(c);
    await c.query("COMMIT");
    return value;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
