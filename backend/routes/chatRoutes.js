// backend/routes/chatRoutes.js
import express from "express";
import { sendChatMessage } from "../controllers/chatController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, sendChatMessage);

export default router;
