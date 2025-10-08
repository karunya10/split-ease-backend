import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import {
  createSettlement,
  getGroupSettlements,
  getUserSettlements,
  getSettlementDetails,
  updateSettlement,
  deleteSettlement,
  markSettlementPaid,
} from "../controllers/settlementController.js";

const router = express.Router();

// Get all settlements for a group
router.get("/:groupId/settlements", verifyToken, getGroupSettlements);

// Get settlements for a specific user
router.get("/settlements/user", verifyToken, getUserSettlements);

// Get specific settlement details
router.get("/settlements/:settlementId", verifyToken, getSettlementDetails);

// Create new settlement
router.post("/:groupId/settlements", verifyToken, createSettlement);

// Update settlement
router.put("/settlements/:settlementId", verifyToken, updateSettlement);

// Mark settlement as paid
router.patch(
  "/settlements/:settlementId/paid",
  verifyToken,
  markSettlementPaid
);

// Delete settlement
router.delete("/settlements/:settlementId", verifyToken, deleteSettlement);

export default router;
