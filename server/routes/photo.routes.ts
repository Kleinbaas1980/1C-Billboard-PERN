import { Router } from "express";
import multer from "multer";
import * as c from "../controllers/photo.controller.js";
import { roles } from "../middleware/auth.js";

const router = Router();

const uploadFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 1 },
}).single("file");

router.post("/", uploadFile, c.upload);
router.post("/main", roles("admin"), uploadFile, c.mainImage);
router.get("/:id", c.read);
router.delete("/:id", c.remove);

export default router;
