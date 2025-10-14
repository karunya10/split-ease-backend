import express from "express";
import prisma from "../prisma.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Search users by email or name
router.get("/search", verifyToken, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== "string") {
      return res.status(400).json({ message: "Search query 'q' is required" });
    }

    const searchTerm = decodeURIComponent(q.trim());

    if (searchTerm.length < 2) {
      return res
        .status(400)
        .json({ message: "Search term must be at least 2 characters long" });
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          {
            email: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          {
            name: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      take: 10,
    });

    res.json({
      users,
      count: users.length,
    });
  } catch (err) {
    console.error("Search users error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
