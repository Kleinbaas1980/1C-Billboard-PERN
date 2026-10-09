import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import supertest from "supertest";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import { hashPassword } from "../utils/crypto.js";
// PGlite runs the PostgreSQL engine only in tests. The production API always uses pg/Neon.
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://unused/test";
process.env.CLIENT_ORIGIN = "http://localhost:3000";
process.env.JWT_SECRET = "test-only-jwt-secret-".repeat(5);
process.env.CSRF_SECRET = "different-test-only-csrf-secret-".repeat(4);
process.env.BLOB_READ_WRITE_TOKEN = "not-used-by-these-tests";
const { pool } = await import("../configs/database.js");
const { app } = await import("../src/app.js");
test("real SQL and HTTP auth, role checks, public privacy, approval and revocation", async () => {
  const external = process.env.TEST_DATABASE_URL;
  if (external && !new URL(external).pathname.endsWith("_1c_test"))
    throw Error(
      "TEST_DATABASE_URL database name must end in _1c_test and be disposable.",
    );
  const db = external ? new Pool({ connectionString: external }) : new PGlite();
  const query = async (sql: string, values?: unknown[]) => {
    if (db instanceof Pool) return db.query(sql, values);
    const result = await db.query(sql, values);
    return {
      rows: result.rows,
      rowCount: result.rows.length || result.affectedRows || 0,
    };
  };
  if (db instanceof Pool) {
    pool.query = db.query.bind(db) as typeof pool.query;
    pool.connect = db.connect.bind(db) as typeof pool.connect;
  } else {
    pool.query = query as typeof pool.query;
    pool.connect = (async () => ({
      query,
      release() {},
    })) as unknown as typeof pool.connect;
  }
  try {
    const schema = await readFile(
      new URL("../sql/001_schema.sql", import.meta.url),
      "utf8",
    );
    if (db instanceof PGlite) await db.exec(schema);
    else await db.query(schema);
    const owner = randomUUID();
    await query(
      "INSERT INTO users(id,email,name,role,password_hash,is_owner) VALUES($1,$2,$3,$4,$5,true)",
      [
        owner,
        "owner@test.example",
        "Test Owner",
        "admin",
        await hashPassword("Testing!Password123"),
      ],
    );
    const anonymous = supertest(app);
    assert.equal((await anonymous.get("/api/assets")).status, 401);
    assert.equal(
      (
        await anonymous
          .post("/api/auth/login")
          .send({
            email: "owner@test.example",
            password: "Testing!Password123",
          })
      ).status,
      403,
    );
    const admin = supertest.agent(app);
    const adminCsrf = (await admin.get("/api/auth/csrf")).body.token;
    const sendAdmin = (
      path: string,
      body: object,
      method: "post" | "patch" | "delete" = "post",
    ) =>
      admin[method](path)
        .set("Origin", "http://localhost:3000")
        .set("x-csrf-token", adminCsrf)
        .send(body);
    assert.equal(
      (
        await sendAdmin("/api/auth/login", {
          email: "owner@test.example",
          password: "wrong",
        })
      ).status,
      401,
    );
    const login = await sendAdmin("/api/auth/login", {
      email: "owner@test.example",
      password: "Testing!Password123",
    });
    assert.equal(login.status, 200);
    const accessCookie = (login.headers["set-cookie"] as unknown as string[])
      .find((c) => c.startsWith("bc_access="))!
      .split(";")[0];
    assert.equal(login.body.user.id, owner);
    assert.equal((await admin.get("/api/auth/me")).body.user.role, "admin");
    assert.equal(
      (
        await sendAdmin("/api/members", {
          name: "Test Assessor",
          email: "assessor@test.example",
          role: "assessor",
          password: "Testing!Password123",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await sendAdmin("/api/assets", {
          id: "TEST-001",
          location: "Test location",
          company: "Test owner",
          advertiser: "Test advertiser",
          contact: "Private contact",
          comments: "Private notes",
          mode: "create",
          userId: "spoofed",
        })
      ).status,
      200,
    );
    const listing = await admin.get("/api/assets");
    assert.equal(listing.body[0].assessorEmail, "owner@test.example");
    const publicCard = await anonymous.get("/api/public/assets/TEST-001");
    assert.deepEqual(Object.keys(publicCard.body).sort(), [
      "advertiser",
      "company",
      "id",
    ]);
    const assessor = supertest.agent(app);
    const assessorCsrf = (await assessor.get("/api/auth/csrf")).body.token;
    const sendAssessor = (
      path: string,
      body: object,
      method: "post" | "patch" = "post",
    ) =>
      assessor[method](path)
        .set("Origin", "http://localhost:3000")
        .set("x-csrf-token", assessorCsrf)
        .send(body);
    assert.equal(
      (
        await sendAssessor("/api/auth/login", {
          email: "assessor@test.example",
          password: "Testing!Password123",
        })
      ).status,
      200,
    );
    assert.equal((await assessor.get("/api/members")).status, 403);
    assert.equal((await assessor.get("/api/assets/export")).status, 403);
    assert.equal(
      (
        await sendAssessor(
          "/api/assets",
          { id: "TEST-001", condition: "Poor", priority: "P1 — Urgent" },
          "patch",
        )
      ).status,
      200,
    );

    assert.equal(
      (
        await sendAdmin("/api/upload-password", {
          email: "assessor@test.example",
          password: "Upload!Password123",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await sendAssessor("/api/upload-unlock", {
          asset: "TEST-001",
          password: "wrong",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await sendAssessor("/api/upload-unlock", {
          asset: "TEST-001",
          password: "Upload!Password123",
        })
      ).status,
      200,
    );
    assert.equal(
      (await assessor.get("/api/upload-unlock?asset=TEST-001")).body.unlocked,
      true,
    );
    assert.equal(
      (await assessor.get("/api/upload-unlock?asset=OTHER")).body.unlocked,
      false,
    );
    assert.equal(
      (
        await sendAdmin("/api/upload-password", {
          email: "assessor@test.example",
          password: "Changed!Password123",
        })
      ).status,
      200,
    );
    assert.equal(
      (await assessor.get("/api/upload-unlock?asset=TEST-001")).body.unlocked,
      false,
    );
    const excel = await admin.get("/api/assets/export");
    assert.equal(excel.status, 200);
    assert.match(excel.headers["content-type"], /spreadsheetml/);
    assert.equal(
      (
        await sendAssessor("/api/deletion-requests", {
          assetId: "TEST-001",
          reason: "Test approval",
        })
      ).status,
      201,
    );
    assert.equal(
      (await anonymous.get("/api/public/assets/TEST-001")).status,
      200,
    );
    const requests = (await admin.get("/api/deletion-requests")).body;
    assert.equal(
      (
        await sendAssessor(
          "/api/deletion-requests",
          { id: requests[0].id, decision: "approved" },
          "patch",
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await sendAdmin(
          "/api/deletion-requests",
          { id: requests[0].id, decision: "approved" },
          "patch",
        )
      ).status,
      200,
    );
    assert.equal(
      (await anonymous.get("/api/public/assets/TEST-001")).status,
      404,
    );
    assert.equal((await admin.get("/api/assets")).body.length, 0);
    assert.equal(
      (
        await sendAdmin(
          "/api/deletion-requests",
          { id: requests[0].id, decision: "approved" },
          "patch",
        )
      ).status,
      409,
    );
    assert.equal((await sendAdmin("/api/auth/refresh", {})).status, 200);
    assert.equal((await sendAdmin("/api/auth/logout", {})).status, 200);
    assert.equal(
      (await anonymous.get("/api/assets").set("Cookie", accessCookie)).status,
      401,
    );
  } finally {
    if (db instanceof Pool) await db.end();
    else await db.close();
    await pool.end();
  }
});
