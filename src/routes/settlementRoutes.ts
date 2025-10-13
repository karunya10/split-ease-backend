import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import {
  markSettlementPaid,
  getUserSettlementSummaryEndpoint,
} from "../controllers/settlementController.js";

const router = express.Router();

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
