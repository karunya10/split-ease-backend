import { Router } from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import {
  createGroupConversation,
  getMessages,
} from "../controllers/chatController.js";

const router = Router();

router.post(
  "/groups/:groupId/conversation",
  verifyToken,
  createGroupConversation
);

router.get("/conversations/:conversationId/messages", verifyToken, getMessages);

export default router;
