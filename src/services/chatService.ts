import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key";

interface AuthenticatedSocket {
  userId: string;
  socket: any;
}

export class ChatService {
  private io: SocketIOServer;
  private authenticatedSockets: Map<string, AuthenticatedSocket> = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: "*", // Configure this properly for production
        methods: ["GET", "POST"],
      },
    });

    this.setupSocketAuthentication();
    this.setupSocketHandlers();
  }

  private setupSocketAuthentication() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;

        if (!token) {
          return next(new Error("Authentication token required"));
        }

        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

        // Verify user exists
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
        });

        if (!user) {
          return next(new Error("User not found"));
        }

        // Store user info in socket
        (socket as any).userId = decoded.userId;
        this.authenticatedSockets.set(socket.id, {
          userId: decoded.userId,
          socket,
        });

        next();
      } catch (error) {
        next(new Error("Invalid authentication token"));
      }
    });
  }

  private setupSocketHandlers() {
    this.io.on("connection", (socket) => {
      const userId = (socket as any).userId;
      console.log(`User ${userId} connected with socket ${socket.id}`);

      this.joinUserGroups(socket, userId);

      socket.on("send_message", async (data) => {
        await this.handleSendMessage(socket, data);
      });

      // Handle disconnect
      socket.on("disconnect", () => {
        console.log(`User ${userId} disconnected`);
        this.authenticatedSockets.delete(socket.id);
      });
    });
  }

  private async joinUserGroups(socket: any, userId: string) {
    try {
      // Get all groups the user is a member of
      const userGroups = await prisma.groupMember.findMany({
        where: { userId },
        include: {
          group: {
            include: {
              conversation: true,
            },
          },
        },
      });

      // Join socket to each group's conversation room
      userGroups.forEach((groupMember) => {
        if (groupMember.group.conversation) {
          const roomName = `conversation_${groupMember.group.conversation.id}`;
          socket.join(roomName);
          console.log(`User ${userId} joined room ${roomName}`);
        }
      });
    } catch (error) {
      console.error("Error joining user groups:", error);
    }
  }

  private async handleSendMessage(
    socket: any,
    data: {
      conversationId: string;
      content: string;
    }
  ) {
    try {
      const userId = socket.userId;
      const { conversationId, content } = data;

      if (!content || content.trim() === "") {
        socket.emit("error", { message: "Message content is required" });
        return;
      }

      // Verify user has access to this conversation
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          group: {
            include: {
              members: {
                where: { userId },
              },
            },
          },
        },
      });

      if (!conversation || conversation.group.members.length === 0) {
        socket.emit("error", {
          message: "You do not have access to this conversation",
        });
        return;
      }

      // Create the message
      const message = await prisma.message.create({
        data: {
          conversationId,
          senderId: userId,
          content: content.trim(),
          messageType: "TEXT",
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              picture: true,
            },
          },
        },
      });

      // Emit the message to all users in the conversation room
      const roomName = `conversation_${conversationId}`;
      this.io.to(roomName).emit("new_message", message);

      // Send confirmation to sender
      socket.emit("message_sent", { messageId: message.id });
    } catch (error) {
      console.error("Error sending message:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  }

 
  public async addUserToConversationRoom(
    userId: string,
    conversationId: string
  ) {
    const roomName = `conversation_${conversationId}`;

    this.authenticatedSockets.forEach((authSocket) => {
      if (authSocket.userId === userId) {
        authSocket.socket.join(roomName);
      }
    });
  }
}

export default ChatService;
