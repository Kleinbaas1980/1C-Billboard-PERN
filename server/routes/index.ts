import { Router } from "express";
import authRoutes from "./auth.routes.js";
import assetRoutes from "./asset.routes.js";
import memberRoutes from "./member.routes.js";
import photoRoutes from "./photo.routes.js";
import deletionRoutes from "./deletion.routes.js";
import {
  publicAsset,
  publicMainImage,
} from "../controllers/asset.controller.js";
import { uploadPassword } from "../controllers/member.controller.js";
import { unlock, unlocked } from "../controllers/photo.controller.js";
import { requireAuth, roles } from "../middleware/auth.js";
const router = Router();
router.use("/auth", authRoutes);
router.get("/public/assets/:id", publicAsset);
router.get("/public/assets/:id/main-image", publicMainImage);
router.use(requireAuth);
router.use("/assets", assetRoutes);
router.use("/members", memberRoutes);
router.use("/photos", photoRoutes);
router.use("/deletion-requests", deletionRoutes);
router.post("/upload-password", roles("admin"), uploadPassword);
router.get("/upload-unlock", unlocked);
router.post("/upload-unlock", unlock);
export default router;
