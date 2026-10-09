import { Router } from "express";
import * as c from "../controllers/member.controller.js";
import { roles } from "../middleware/auth.js";
const router = Router();
router.use(roles("admin"));
router.get("/", c.list);
router.post("/", c.save);
router.delete("/", c.deactivate);
export default router;
