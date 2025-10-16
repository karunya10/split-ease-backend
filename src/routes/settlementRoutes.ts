import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import {
  markSettlementPaid,
  getUserSettlementSummaryEndpoint,
} from "../controllers/settlementController.js";

const router = express.Router();

router.patch(
  "/settlements/:settlementId/paid",
  verifyToken,
  markSettlementPaid
);

router.get(
  "/:groupId/settlements/summary",
  verifyToken,
  getUserSettlementSummaryEndpoint
);

export default router;
