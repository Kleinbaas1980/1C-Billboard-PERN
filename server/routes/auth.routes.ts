import { Router } from "express";
import * as c from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { forgotSchema, resetSchema } from "../utils/validation.js";

const router = Router();
router.get("/csrf", c.csrfToken);
router.post("/login", c.login);
router.post("/refresh", c.refresh);
router.post("/logout", c.logout);
router.post("/forgot-password", validate(forgotSchema), c.forgot);
router.post("/reset-password", validate(resetSchema), c.reset);
router.get("/me", requireAuth, c.me);
router.post("/password", requireAuth, c.changePassword);
export default router;
