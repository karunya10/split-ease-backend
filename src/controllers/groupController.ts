import type { Response } from "express";
import type { AuthRequest } from "../middlewares/authMiddleware.js";
import prisma from "../prisma.js";

export async function createGroup(req: AuthRequest, res: Response) {
  try {
    const { name } = req.body;

    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!name) {
      return res.status(400).json({ message: "Group name is required" });
    }

    const group = await prisma.group.create({
      data: { name },
    });

    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: req.userId,
        role: "owner",
      },
    });

    res.status(201).json(group);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getUserGroups(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const groups = await prisma.group.findMany({
      where: {
        members: {
          some: {
            userId: req.userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        _count: {
          select: { expenses: true },
        },
      },
    });

    res.json(groups);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getGroupById(req: AuthRequest, res: Response) {
  try {
    const { groupId } = req.params;

    if (!req.userId || !groupId) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId: req.userId },
    });

    if (!membership) {
      return res.status(403).json({ message: "Access denied" });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        expenses: {
          include: {
            paidBy: {
              select: { id: true, name: true, email: true },
            },
            splits: {
              include: {
                user: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    res.json(group);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function updateGroupById(req: AuthRequest, res: Response) {
  try {
    const { groupId } = req.params;
    const { name } = req.body;

    if (!req.userId || !groupId) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId: req.userId, role: { in: ["admin", "owner"] } },
    });

    if (!membership) {
      return res
        .status(403)
        .json({ message: "Only admins can update group details" });
    }

    const updatedGroup = await prisma.group.update({
      where: { id: groupId },
      data: { name },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    res.json(updatedGroup);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function deleteGroup(req: AuthRequest, res: Response) {
  try {
    const { groupId } = req.params;

    if (!req.userId || !groupId) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId: req.userId, role: "owner" },
    });

    if (!membership) {
      return res
        .status(403)
        .json({ message: "Only group owner can delete the group" });
    }

    await prisma.group.delete({
      where: { id: groupId },
    });

    res.json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}
