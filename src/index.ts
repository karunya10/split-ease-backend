import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import authRoutes from "./routes/authRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import memberRoutes from "./routes/memberRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import settlementRoutes from "./routes/settlementRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import ChatService from "./services/chatService.js";


dotenv.config();
const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/groups", groupRoutes);
app.use("/groups", memberRoutes);
app.use("/groups", expenseRoutes);
app.use("/groups", settlementRoutes);
app.use("/chat", chatRoutes);


const chatService = new ChatService(server);


export { chatService };

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO enabled for real-time chat`);
});
