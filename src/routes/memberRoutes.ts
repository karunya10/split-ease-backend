import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { addMemberToGroup } from "../controllers/memberController.js";

const router = express.Router();

router.post("/:groupId/members", verifyToken, addMemberToGroup);

export default router;
