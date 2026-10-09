import { Router } from "express";
import * as c from "../controllers/deletion.controller.js";
import { roles } from "../middleware/auth.js";
const router = Router();
router.get("/", c.list);
router.post("/", c.request);
router.patch("/", roles("admin"), c.review);
export default router;
