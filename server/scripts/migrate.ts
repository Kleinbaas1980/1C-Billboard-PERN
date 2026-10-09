import { readFile } from "node:fs/promises";
import { pool } from "../configs/database.js";
try {
  await pool.query(
    await readFile(new URL("../sql/001_schema.sql", import.meta.url), "utf8"),
  );
  console.log("Schema installed.");
} finally {
  await pool.end();
}
