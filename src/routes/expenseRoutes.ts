import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import {
  createExpense,
  deleteExpense,
} from "../controllers/expenseController.js";

const router = express.Router();

//Create new expense
router.post("/:groupId/expenses", verifyToken, createExpense);

// Delete expense
router.delete("/:groupId/expenses/:expenseId", verifyToken, deleteExpense);

export default router;
