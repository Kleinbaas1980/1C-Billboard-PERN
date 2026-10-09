import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z
    .string()
    .regex(/^postgres(?:ql)?:\/\//, "Use a PostgreSQL connection URL"),
  JWT_SECRET: z.string().min(64),
  CSRF_SECRET: z.string().min(64),
  CLIENT_ORIGIN: z.url(),
  BLOB_READ_WRITE_TOKEN: z.string().min(1),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
});

export const env = schema.parse(process.env);
if (env.NODE_ENV === "production" && !env.CLIENT_ORIGIN.startsWith("https://"))
  throw Error("Production CLIENT_ORIGIN requires HTTPS");
if (new URL(env.CLIENT_ORIGIN).origin !== env.CLIENT_ORIGIN)
  throw Error("CLIENT_ORIGIN must be an origin without a trailing slash");

if (env.JWT_SECRET === env.CSRF_SECRET)
  throw Error("JWT_SECRET and CSRF_SECRET must be different");
