import type { Response } from "express";
import type { AuthRequest } from "../middlewares/authMiddleware.js";
import prisma from "../prisma.js";
import { updateGroupSettlements } from "../utils/settlementCalculator.js";

// Get all expenses for a group
export async function getGroupExpenses(req: AuthRequest, res: Response) {
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

    const expenses = await prisma.expense.findMany({
      where: { groupId },
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
    });

    res.json(expenses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}

// Get specific expense details
/*export async function getExpenseDetails(req: AuthRequest, res: Response) {
  try {
    const { groupId, expenseId } = req.params;

    if (!groupId || !expenseId || !req.userId) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    // Check if user is member of the group
    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId: req.userId },
    });

    if (!membership) {
      return res.status(403).json({ message: "Access denied" });
    }

    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, groupId },
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

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.json(expense);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}*/

// Create new expense
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

    // Automatically update settlements for the group
    try {
      await updateGroupSettlements(groupId);
    } catch (settlementError) {
      console.error("Error updating settlements:", settlementError);
      // Don't fail the expense creation if settlement update fails
    }

    res.status(201).json(expense);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}

// Update expense
export async function updateExpense(req: AuthRequest, res: Response) {
  try {
    const { groupId, expenseId } = req.params;
    const { description, amount, splits } = req.body;

    if (!groupId || !expenseId || !req.userId) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    // Check if user is member of the group
    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId: req.userId },
    });

    if (!membership) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Check if expense exists and belongs to the group
    const existingExpense = await prisma.expense.findFirst({
      where: { id: expenseId, groupId },
    });

    if (!existingExpense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    // Use transaction to update expense and splits atomically
    const updatedExpense = await prisma.$transaction(async (tx) => {
      // Update the expense
      const expense = await tx.expense.update({
        where: { id: expenseId },
        data: { description, amount },
      });

      // If splits are provided, replace all existing splits
      if (splits && Array.isArray(splits)) {
        // Delete existing splits
        await tx.expenseSplit.deleteMany({
          where: { expenseId },
        });

        // Create new splits if any provided
        if (splits.length > 0) {
          await tx.expenseSplit.createMany({
            data: splits.map((split: any) => ({
              expenseId,
              userId: split.userId,
              amountOwed: split.amountOwed,
            })),
          });
        }
      }

      // Return updated expense with splits
      return await tx.expense.findUnique({
        where: { id: expenseId },
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
    });

    // Automatically update settlements for the group
    try {
      await updateGroupSettlements(groupId);
    } catch (settlementError) {
      console.error("Error updating settlements:", settlementError);
      // Don't fail the expense update if settlement update fails
    }

    res.json(updatedExpense);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}

// Delete expense
export async function deleteExpense(req: AuthRequest, res: Response) {
  try {
    const { groupId, expenseId } = req.params;

    if (!groupId || !expenseId || !req.userId) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    // Check if user has permission (member of group and either expense creator or admin)
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

    // Only the person who created the expense or admin can delete it
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

    // Automatically update settlements for the group
    try {
      await updateGroupSettlements(groupId);
    } catch (settlementError) {
      console.error("Error updating settlements:", settlementError);
      // Don't fail the expense deletion if settlement update fails
    }

    res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}
