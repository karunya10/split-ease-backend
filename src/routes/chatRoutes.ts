import { Router } from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import {
  createGroupConversation,
  getGroupConversation,
  getMessages,
} from "../controllers/chatController.js";

const router = Router();

router.get("/groups/:groupId/conversation", verifyToken, getGroupConversation);

router.post(
  "/groups/:groupId/conversation",
  verifyToken,
  createGroupConversation
);

router.get("/conversations/:conversationId/messages", verifyToken, getMessages);

export default router;
