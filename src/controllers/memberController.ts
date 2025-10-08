import type { Response } from "express";
import type { AuthRequest } from "../middlewares/authMiddleware.js";
import prisma from "../prisma.js";

// Get all members of a group
export async function getMembersByGroup(req: AuthRequest, res: Response) {
  try {
    const { groupId } = req.params;

    if (!groupId || !req.userId) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    // Check if user is member of the group
    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId: req.userId },
    });

    if (!membership) {
      return res.status(403).json({ message: "Access denied" });
    }

    const members = await prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json(members);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}

// Get specific member details
export async function getMemberDetails(req: AuthRequest, res: Response) {
  try {
    const { groupId, memberId } = req.params;

    if (!groupId || !memberId || !req.userId) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    // Check if user is member of the group
    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId: req.userId },
    });

    if (!membership) {
      return res.status(403).json({ message: "Access denied" });
    }

    const member = await prisma.groupMember.findFirst({
      where: { groupId, userId: memberId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    res.json(member);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}

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

// Remove member from group
export async function removeMemberFromGroup(req: AuthRequest, res: Response) {
  try {
    const { groupId, memberId } = req.params;

    if (!groupId || !memberId || !req.userId) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    // Check if user is admin/owner of the group or removing themselves
    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId: req.userId },
    });

    if (!membership) {
      return res.status(403).json({ message: "Access denied" });
    }

    const isAdmin = membership.role === "admin" || membership.role === "owner";
    const isSelf = req.userId === memberId;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({
        message: "Can only remove yourself or admin can remove others",
      });
    }

    const deletedMember = await prisma.groupMember.deleteMany({
      where: { groupId, userId: memberId },
    });

    if (deletedMember.count === 0) {
      return res.status(404).json({ message: "Member not found" });
    }

    res.json({ message: "Member removed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}
