import type { Response } from "express";
import type { AuthRequest } from "../middlewares/authMiddleware.js";
import prisma from "../prisma.js";

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
export async function getExpenseDetails(req: AuthRequest, res: Response) {
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
}

// Create new expense
export async function createExpense(req: AuthRequest, res: Response) {
  try {
    const { groupId } = req.params;
    const { description, amount, paidById, splits } = req.body;

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
    const { description, amount } = req.body;

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

    const updatedExpense = await prisma.expense.update({
      where: { id: expenseId },
      data: { description, amount },
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

    res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}

// Add expense split
export async function addExpenseSplit(req: AuthRequest, res: Response) {
  try {
    const { groupId, expenseId } = req.params;
    const { userId, amountOwed } = req.body;

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

    // Check if expense exists
    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, groupId },
    });

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    const split = await prisma.expenseSplit.create({
      data: {
        expenseId,
        userId,
        amountOwed,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(201).json(split);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}

// Update expense split
export async function updateExpenseSplit(req: AuthRequest, res: Response) {
  try {
    const { groupId, expenseId, splitId } = req.params;
    const { amountOwed } = req.body;

    if (!groupId || !expenseId || !splitId || !req.userId) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    // Check if user is member of the group
    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId: req.userId },
    });

    if (!membership) {
      return res.status(403).json({ message: "Access denied" });
    }

    const updatedSplit = await prisma.expenseSplit.update({
      where: { id: splitId },
      data: { amountOwed },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json(updatedSplit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}

// Delete expense split
export async function deleteExpenseSplit(req: AuthRequest, res: Response) {
  try {
    const { groupId, expenseId, splitId } = req.params;

    if (!groupId || !expenseId || !splitId || !req.userId) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    // Check if user is member of the group
    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId: req.userId },
    });

    if (!membership) {
      return res.status(403).json({ message: "Access denied" });
    }

    await prisma.expenseSplit.delete({
      where: { id: splitId },
    });

    res.json({ message: "Expense split deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}
