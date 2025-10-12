import type { Response } from "express";
import type { AuthRequest } from "../middlewares/authMiddleware.js";
import prisma from "../prisma.js";
import { getUserSettlementSummary } from "../utils/settlementCalculator.js";

// Get all settlements for a group
export async function getGroupSettlements(req: AuthRequest, res: Response) {
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

    const settlements = await prisma.settlement.findMany({
      where: { groupId },
      include: {
        fromUser: {
          select: { id: true, name: true, email: true },
        },
        toUser: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(settlements);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}

// Get settlements for a specific user
export async function getUserSettlements(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(400).json({ message: "Missing user ID" });
    }

    const settlements = await prisma.settlement.findMany({
      where: {
        OR: [{ fromUserId: req.userId }, { toUserId: req.userId }],
      },
      include: {
        fromUser: {
          select: { id: true, name: true, email: true },
        },
        toUser: {
          select: { id: true, name: true, email: true },
        },
        group: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(settlements);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}

// Mark settlement as paid (this could be implemented with a status field)
export async function markSettlementPaid(req: AuthRequest, res: Response) {
  try {
    const { settlementId } = req.params;

    if (!settlementId || !req.userId) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
    });

    if (!settlement) {
      return res.status(404).json({ message: "Settlement not found" });
    }

    // Check if settlement is already paid
    if (settlement.status === "PAID") {
      return res.status(400).json({ message: "Settlement is already paid" });
    }

    // Only the person who owes money can mark as paid
    if (settlement.fromUserId !== req.userId) {
      return res
        .status(403)
        .json({ message: "Only the payer can mark settlement as paid" });
    }

    // Update settlement status to paid instead of deleting
    await prisma.settlement.update({
      where: { id: settlementId },
      data: { status: "PAID" },
    });

    res.json({ message: "Settlement marked as paid" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}

// Get user settlement summary
export async function getUserSettlementSummaryEndpoint(
  req: AuthRequest,
  res: Response
) {
  try {
    const { groupId } = req.params;

    if (!req.userId) {
      return res.status(400).json({ message: "Missing user ID" });
    }

    // If groupId is provided, check if user is member of the group
    if (groupId) {
      const membership = await prisma.groupMember.findFirst({
        where: { groupId, userId: req.userId },
      });

      if (!membership) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const summary = await getUserSettlementSummary(req.userId, groupId);

    res.json(summary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}
