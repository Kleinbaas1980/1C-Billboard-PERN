import { randomUUID } from "node:crypto";
import { pool } from "../configs/database.js";
import { emailSchema, passwordSchema } from "../utils/validation.js";
import { hashPassword } from "../utils/crypto.js";
const email = emailSchema.parse(process.env.ADMIN_EMAIL);
const password = passwordSchema.parse(process.env.ADMIN_PASSWORD);
const name = process.env.ADMIN_NAME?.trim();
if (!name) throw Error("ADMIN_NAME is required.");
try {
  await pool.query(
    "INSERT INTO users(id,email,name,role,password_hash,is_owner) VALUES($1,$2,$3,$4,$5,true)",
    [randomUUID(), email, name, "admin", await hashPassword(password)],
  );
  console.log(
    "Owner account created. Remove ADMIN_PASSWORD from your environment.",
  );
} finally {
  await pool.end();
}
