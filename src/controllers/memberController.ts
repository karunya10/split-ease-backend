import type { Response } from "express";
import type { AuthRequest } from "../middlewares/authMiddleware.js";
import prisma from "../prisma.js";

// Add member to group
export async function addMemberToGroup(req: AuthRequest, res: Response) {
  try {
    const { groupId } = req.params;
    const { userId, role = "member" } = req.body;

    if (!groupId || !userId || !req.userId) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    // Check if user is admin/owner of the group
    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId: req.userId, role: { in: ["admin", "owner"] } },
    });

    if (!membership) {
      return res.status(403).json({ message: "Only admins can add members" });
    }

    // Check if user to be added exists
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userExists) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is already a member
    const existingMember = await prisma.groupMember.findFirst({
      where: { groupId, userId },
    });

    if (existingMember) {
      return res.status(400).json({ message: "User is already a member" });
    }

    const newMember = await prisma.groupMember.create({
      data: { groupId, userId, role },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(201).json(newMember);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}
