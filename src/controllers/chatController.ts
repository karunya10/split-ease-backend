import type { Response } from "express";
import type { AuthRequest } from "../middlewares/authMiddleware.js";
import prisma from "../prisma.js";

// Get conversation for a group
export const getGroupConversation = async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!groupId) {
      return res.status(400).json({ error: "Group ID is required" });
    }

    // Check if user is a member of the group
    const groupMember = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
      },
    });

    if (!groupMember) {
      return res
        .status(403)
        .json({ error: "You are not a member of this group" });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { groupId },
      include: {
        group: {
          select: { id: true, name: true },
        },
      },
    });

    if (!conversation) {
      return res
        .status(404)
        .json({ error: "Conversation not found for this group" });
    }

    res.json(conversation);
  } catch (error) {
    console.error("Error getting conversation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Create conversation for a group
export const createGroupConversation = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { groupId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!groupId) {
      return res.status(400).json({ error: "Group ID is required" });
    }

    // Check if user is a member of the group
    const groupMember = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
      },
    });

    if (!groupMember) {
      return res
        .status(403)
        .json({ error: "You are not a member of this group" });
    }

    // Check if conversation already exists
    const existingConversation = await prisma.conversation.findUnique({
      where: { groupId },
    });

    if (existingConversation) {
      return res
        .status(409)
        .json({ error: "Conversation already exists for this group" });
    }

    const conversation = await prisma.conversation.create({
      data: { groupId },
      include: {
        group: {
          select: { id: true, name: true },
        },
      },
    });

    res.status(201).json(conversation);
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get messages for a conversation
export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { page = "1", limit = "50" } = req.query;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!conversationId) {
      return res.status(400).json({ error: "Conversation ID is required" });
    }

    // Validate and parse pagination parameters
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit as string) || 50)
    );

    // Check if user has access to this conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        group: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!conversation || conversation.group.members.length === 0) {
      return res
        .status(403)
        .json({ error: "You do not have access to this conversation" });
    }

    const skip = (pageNum - 1) * limitNum;

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            picture: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limitNum,
    });

    // Reverse to show oldest first
    const reversedMessages = messages.reverse();

    res.json({
      messages: reversedMessages,
      hasMore: messages.length === limitNum,
    });
  } catch (error) {
    console.error("Error getting messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
