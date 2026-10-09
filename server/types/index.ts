export type Role = "admin" | "assessor";
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  is_owner: boolean;
  sessionId: string;
}
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      userId?: string;
      requestId?: string;
    }
  }
}
export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  password_hash: string;
  upload_password_hash: string | null;
  upload_version: number;
  active: boolean;
  is_owner: boolean;
}
