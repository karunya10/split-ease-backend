import type { Response } from "express";
import type { AuthRequest } from "../middlewares/authMiddleware.js";
import prisma from "../prisma.js";
import { getUserSettlementSummary } from "../utils/settlementCalculator.js";

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

    if (settlement.status === "PAID") {
      return res.status(400).json({ message: "Settlement is already paid" });
    }

    if (settlement.fromUserId !== req.userId) {
      return res
        .status(403)
        .json({ message: "Only the payer can mark settlement as paid" });
    }

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

export async function getUserSettlementSummaryEndpoint(
  req: AuthRequest,
  res: Response
) {
  try {
    const { groupId } = req.params;

    if (!req.userId) {
      return res.status(400).json({ message: "Missing user ID" });
    }

    if (!groupId) {
      return res.status(400).json({ message: "Missing group ID" });
    }

    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId: req.userId },
    });

    if (!membership) {
      return res.status(403).json({ message: "Access denied" });
    }

    const summary = await getUserSettlementSummary(req.userId, groupId);

    res.json(summary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}
