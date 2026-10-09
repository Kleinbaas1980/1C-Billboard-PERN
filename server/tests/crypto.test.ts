import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hashPassword,
  verifyPassword,
  signCsrf,
  validCsrf,
  randomToken,
  tokenHash,
} from "../utils/crypto.js";
import { assetSchema, passwordSchema } from "../utils/validation.js";
test("salted scrypt verifies only the correct password", async () => {
  const a = await hashPassword("Example!Secure123"),
    b = await hashPassword("Example!Secure123");
  assert.notEqual(a, b);
  assert.equal(await verifyPassword("Example!Secure123", a), true);
  assert.equal(await verifyPassword("incorrect", a), false);
  assert.equal(await verifyPassword("x", "invalid"), false);
});
test("CSRF signature rejects tampering and foreign signing keys", () => {
  const token = signCsrf(randomToken(), "one");
  assert.equal(validCsrf(token, "one"), true);
  assert.equal(validCsrf(token, "two"), false);
  assert.equal(validCsrf(token + "x", "one"), false);
  assert.equal(tokenHash("a").length, 64);
});
test("asset validation rejects invalid identifiers and ratings and strips caller identity", () => {
  assert.equal(
    assetSchema.safeParse({
      id: "../bad",
      location: "A",
      company: "B",
      mode: "create",
    }).success,
    false,
  );
  assert.equal(
    assetSchema.safeParse({
      id: "REAL-001",
      location: "A",
      company: "B",
      mode: "create",
      condition: "made up",
    }).success,
    false,
  );
  const a = assetSchema.parse({
    id: "REAL-001",
    location: "A",
    company: "B",
    mode: "create",
    userId: "forged",
  });
  assert.equal("userId" in a, false);
  assert.equal(passwordSchema.safeParse("weak").success, false);
});
