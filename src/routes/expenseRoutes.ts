import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import {
  createExpense,
  getGroupExpenses,
  updateExpense,
  deleteExpense,
} from "../controllers/expenseController.js";

const router = express.Router();

// Get all expenses for a group
router.get("/:groupId/expenses", verifyToken, getGroupExpenses);

// Get specific expense details
//router.get("/:groupId/expenses/:expenseId", verifyToken, getExpenseDetails);

// Create new expense
router.post("/:groupId/expenses", verifyToken, createExpense);

// Update expense
router.put("/:groupId/expenses/:expenseId", verifyToken, updateExpense);

// Delete expense
router.delete("/:groupId/expenses/:expenseId", verifyToken, deleteExpense);

export default router;
