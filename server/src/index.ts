import { app } from "./app.js";
import { pool } from "../configs/database.js";
import { env } from "../configs/env.js";
await pool.query("SELECT 1");
const server = app.listen(env.PORT, () =>
  console.log("API listening on port " + env.PORT),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    server.close(() => {
      void pool.end().then(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10000).unref();
  });
