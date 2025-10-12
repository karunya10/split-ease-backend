import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import {
  getGroupSettlements,
  getUserSettlements,
  markSettlementPaid,
  getUserSettlementSummaryEndpoint,
} from "../controllers/settlementController.js";

const router = express.Router();

// Get all settlements for a group
router.get("/:groupId/settlements", verifyToken, getGroupSettlements);

// Get settlements for a specific user
router.get("/settlements/user", verifyToken, getUserSettlements);

// Mark settlement as paid
router.patch(
  "/settlements/:settlementId/paid",
  verifyToken,
  markSettlementPaid
);

// Get user settlement summary for a specific group
router.get(
  "/:groupId/settlements/summary",
  verifyToken,
  getUserSettlementSummaryEndpoint
);

export default router;
