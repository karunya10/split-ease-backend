import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import {
  addMemberToGroup,
  removeMemberFromGroup,
  getMembersByGroup,
  getMemberDetails,
} from "../controllers/memberController.js";

const router = express.Router();

router.get("/:groupId/members", verifyToken, getMembersByGroup);

router.get("/:groupId/members/:memberId", verifyToken, getMemberDetails);

router.post("/:groupId/members", verifyToken, addMemberToGroup);

router.delete(
  "/:groupId/members/:memberId",
  verifyToken,
  removeMemberFromGroup
);

export default router;
