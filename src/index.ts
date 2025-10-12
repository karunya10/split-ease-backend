import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import memberRoutes from "./routes/memberRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import settlementRoutes from "./routes/settlementRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { verifyToken } from "./middlewares/authMiddleware.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/groups", groupRoutes);
app.use("/groups", memberRoutes);
app.use("/groups", expenseRoutes);
app.use("/groups", settlementRoutes);

// Protected route example
app.get("/profile", verifyToken, (req, res) => {
  res.json({ message: "Token is valid. You are authenticated!" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
