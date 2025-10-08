import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import {
  createGroup,
  getUserGroups,
  getGroupById,
  deleteGroup,
  updateGroupById,
} from "../controllers/groupController.js";

const router = express.Router();

router.post("/", verifyToken, createGroup);
router.get("/", verifyToken, getUserGroups);
router.get("/:groupId", verifyToken, getGroupById);
router.put("/:groupId", verifyToken, updateGroupById);
router.delete("/:groupId", verifyToken, deleteGroup);

export default router;
