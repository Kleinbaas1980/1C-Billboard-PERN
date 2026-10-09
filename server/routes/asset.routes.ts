import { Router } from "express";
import * as c from "../controllers/asset.controller.js";
import { roles } from "../middleware/auth.js";
const router = Router();
router.get("/", c.list);
router.post("/", c.save);
router.patch("/", c.ratings);
router.get("/export", roles("admin"), c.excel);
export default router;
