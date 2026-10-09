import { Router } from "express";
import multer from "multer";
import * as c from "../controllers/photo.controller.js";
const router = Router();
router.post(
  "/",
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 1 },
  }).single("file"),
  c.upload,
);
router.get("/:id", c.read);
router.delete("/:id", c.remove);
export default router;
