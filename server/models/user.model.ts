import { pool } from "../configs/database.js";
import type { UserRow } from "../types/index.js";
export async function findUserByEmail(email: string) {
  return (
    await pool.query<UserRow>("SELECT * FROM users WHERE email=$1", [email])
  ).rows[0];
}
export function publicUser(u: {
  id: string;
  email: string;
  name: string;
  role: string;
  is_owner: boolean;
}) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    owner: u.is_owner,
  };
}
