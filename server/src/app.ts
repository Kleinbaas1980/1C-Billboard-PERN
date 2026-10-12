import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { env } from "../configs/env.js";
import { csrf } from "../middleware/csrf.js";
import { errorHandler } from "../utils/errors.js";
import routes from "../routes/index.js";
export const app = express();
app.disable("x-powered-by");
app.set("trust proxy", env.TRUST_PROXY_HOPS);
app.use((req, _res, next) => {
  req.requestId = randomUUID();
  next();
});
app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(
  rateLimit({
    windowMs: 60000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);

// app.use((req, _res, next) => {
//   console.log(req.method, req.originalUrl, req.headers.origin);
//   next();
// });

app.use(express.json({ limit: "256kb" }));
app.use(cookieParser());
app.use(
  "/api",
  (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  },
  csrf,
  routes,
);
app.use((_req, res) => res.status(404).json({ error: "Route not found." }));
app.use(errorHandler);
