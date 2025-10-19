import type { Response } from "express";
import type { AuthRequest } from "../middlewares/authMiddleware.js";
import prisma from "../prisma.js";
import { updateGroupSettlements } from "../utils/settlementCalculator.js";
import {
  sendEmail,
  generateExpenseNotificationEmail,
  isExpenseNotificationEnabled,
} from "../utils/emailService.js";

async function notifyGroupMembers(expense: any, groupId: string) {
  if (!isExpenseNotificationEnabled()) {
    console.log("📧 Expense notifications are disabled");
    return;
  }

  try {
    const groupMembers = await prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        group: {
          select: { name: true },
        },
      },
    });

    if (groupMembers.length === 0) {
      console.log(
        "No members to notify (no email addresses or only payer in group)"
      );
      return;
    }

    const expenseData = {
      description: expense.description,
      amount: parseFloat(expense.amount.toString()),
      paidByName: expense.paidBy.name || expense.paidBy.email || "Unknown",
      groupName: groupMembers[0]?.group.name || "Unknown Group",
    };

    const emailPromises = groupMembers.map(async (member) => {
      const { subject, html, text } = generateExpenseNotificationEmail(
        expenseData,
        member.user.name || member.user.email || "Member"
      );

      return sendEmail({
        to: member.user.email!,
        subject,
        html,
        text,
      });
    });

    const results = await Promise.allSettled(emailPromises);

    const successful = results.filter(
      (result) => result.status === "fulfilled" && result.value
    ).length;
    const failed = results.length - successful;

    if (successful > 0 || failed > 0) {
      console.log(
        `📧 Email notifications: ${successful} sent, ${failed} failed out of ${groupMembers.length} members`
      );
    }
  } catch (error) {
    console.error("Error sending email notifications:", error);
  }
}

export async function createExpense(req: AuthRequest, res: Response) {
  try {
    const { groupId } = req.params;
    const { description, amount, paidById, splits } = req.body;

    if (!groupId || !req.userId) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId: req.userId },
    });

    if (!membership) {
      return res.status(403).json({ message: "Access denied" });
    }

    const expenseData: any = {
      description,
      amount,
      paidById: paidById || req.userId,
      groupId,
    };

    if (splits && splits.length > 0) {
      expenseData.splits = {
        create: splits.map((split: any) => ({
          userId: split.userId,
          amountOwed: split.amountOwed,
        })),
      };
    }

    const expense = await prisma.expense.create({
      data: expenseData,
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
    });

    try {
      await updateGroupSettlements(groupId);
    } catch (settlementError) {
      console.error("Error updating settlements:", settlementError);
    }

    try {
      notifyGroupMembers(expense, groupId).catch((error) => {
        console.error("Background email notification error:", error);
      });
    } catch (notificationError) {
      console.error("Error starting email notifications:", notificationError);
    }

    res.status(201).json(expense);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function deleteExpense(req: AuthRequest, res: Response) {
  try {
    const { groupId, expenseId } = req.params;

    if (!groupId || !expenseId || !req.userId) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId: req.userId },
    });

    if (!membership) {
      return res.status(403).json({ message: "Access denied" });
    }

    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, groupId },
    });

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    const isAdmin = membership.role === "admin" || membership.role === "owner";
    const isCreator = expense.paidById === req.userId;

    if (!isAdmin && !isCreator) {
      return res
        .status(403)
        .json({ message: "Only expense creator or admin can delete" });
    }

    await prisma.expense.delete({
      where: { id: expenseId },
    });

    try {
      await updateGroupSettlements(groupId);
    } catch (settlementError) {
      console.error("Error updating settlements:", settlementError);
    }

    res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}
