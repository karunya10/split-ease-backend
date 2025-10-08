import type { Response } from "express";
import type { AuthRequest } from "../middlewares/authMiddleware.js";
import prisma from "../prisma.js";

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

// Get specific settlement details
export async function getSettlementDetails(req: AuthRequest, res: Response) {
  try {
    const { settlementId } = req.params;

    if (!settlementId || !req.userId) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
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
    });

    if (!settlement) {
      return res.status(404).json({ message: "Settlement not found" });
    }

    // Check if user is involved in the settlement
    if (
      settlement.fromUserId !== req.userId &&
      settlement.toUserId !== req.userId
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(settlement);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}

// Create new settlement
export async function createSettlement(req: AuthRequest, res: Response) {
  try {
    const { groupId } = req.params;
    const { fromUserId, toUserId, amount } = req.body;

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

    // Verify both users are members of the group
    const fromMember = await prisma.groupMember.findFirst({
      where: { groupId, userId: fromUserId },
    });

    const toMember = await prisma.groupMember.findFirst({
      where: { groupId, userId: toUserId },
    });

    if (!fromMember || !toMember) {
      return res
        .status(400)
        .json({ message: "Both users must be members of the group" });
    }

    const settlement = await prisma.settlement.create({
      data: {
        fromUserId,
        toUserId,
        groupId,
        amount,
      },
      include: {
        fromUser: {
          select: { id: true, name: true, email: true },
        },
        toUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(201).json(settlement);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}

// Update settlement
export async function updateSettlement(req: AuthRequest, res: Response) {
  try {
    const { settlementId } = req.params;
    const { amount } = req.body;

    if (!settlementId || !req.userId) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
    });

    if (!settlement) {
      return res.status(404).json({ message: "Settlement not found" });
    }

    // Only involved users can update the settlement
    if (
      settlement.fromUserId !== req.userId &&
      settlement.toUserId !== req.userId
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    const updatedSettlement = await prisma.settlement.update({
      where: { id: settlementId },
      data: { amount },
      include: {
        fromUser: {
          select: { id: true, name: true, email: true },
        },
        toUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json(updatedSettlement);
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

    // Only the person who owes money can mark as paid
    if (settlement.fromUserId !== req.userId) {
      return res
        .status(403)
        .json({ message: "Only the payer can mark settlement as paid" });
    }

    // For now, we'll delete the settlement to mark it as "paid"
    // In a real app, you might want to add a "status" field instead
    await prisma.settlement.delete({
      where: { id: settlementId },
    });

    res.json({ message: "Settlement marked as paid" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}

// Delete settlement
export async function deleteSettlement(req: AuthRequest, res: Response) {
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

    // Only involved users can delete the settlement
    if (
      settlement.fromUserId !== req.userId &&
      settlement.toUserId !== req.userId
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    await prisma.settlement.delete({
      where: { id: settlementId },
    });

    res.json({ message: "Settlement deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}
