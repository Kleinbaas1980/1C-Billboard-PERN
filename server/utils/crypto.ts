import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
  createHmac,
} from "node:crypto";

// Explicit scrypt cost parameters are shared by creation and verification.
const scrypt = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      64,
      { N: 65536, r: 8, p: 2, maxmem: 128 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });

export const randomToken = () => randomBytes(32).toString("hex");

export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt)) as Buffer;
  return "scrypt$" + salt + "$" + derived.toString("hex");
}

export async function verifyPassword(password: string, hash: string) {
  const [kind, salt, value] = hash.split("$");
  if (kind !== "scrypt" || !salt || !/^[a-f0-9]{128}$/.test(value || ""))
    return false;
  const derived = (await scrypt(password, salt)) as Buffer;
  return timingSafeEqual(derived, Buffer.from(value, "hex"));
}

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function signCsrf(nonce: string, secret: string) {
  return nonce + "." + createHmac("sha256", secret).update(nonce).digest("hex");
}

export function validCsrf(value: string, secret: string) {
  const [nonce, signature, ...rest] = value.split(".");
  return (
    !rest.length &&
    /^[a-f0-9]{64}$/.test(nonce || "") &&
    safeEqual(signCsrf(nonce, secret), nonce + "." + signature)
  );
}
