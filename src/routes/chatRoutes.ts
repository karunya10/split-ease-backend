import { Router } from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import {
  createGroupConversation,
  getGroupConversation,
  getMessages,
} from "../controllers/chatController.js";

const router = Router();

// Get existing conversation for a group
router.get("/groups/:groupId/conversation", verifyToken, getGroupConversation);

// Create new conversation for a group
router.post(
  "/groups/:groupId/conversation",
  verifyToken,
  createGroupConversation
);

router.get("/conversations/:conversationId/messages", verifyToken, getMessages);

export default router;
