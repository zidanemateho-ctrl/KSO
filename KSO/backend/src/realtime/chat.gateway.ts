import { createHash } from "crypto";
import { Server as HttpServer } from "http";

import { Server, Socket } from "socket.io";

import { logger } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { chatService } from "../services/chat.service";
import { validateCorsOrigin } from "../utils/cors";
import { verifyToken } from "../utils/jwt";

type RealtimeAck = (payload: { ok: boolean; error?: string; data?: unknown }) => void;

interface ChatSocket extends Socket {
  data: {
    actor?: Express.AuthUser;
  };
}

function roomName(groupId: string) {
  return `chat:${groupId}`;
}

function safeAck(ack: RealtimeAck | undefined, payload: { ok: boolean; error?: string; data?: unknown }) {
  if (typeof ack === "function") {
    ack(payload);
  }
}

function extractToken(socket: Socket) {
  const handshakeToken = typeof socket.handshake.auth?.token === "string" ? socket.handshake.auth.token : null;
  if (handshakeToken) {
    return handshakeToken;
  }

  const authorization = socket.handshake.headers.authorization;
  if (typeof authorization === "string" && authorization.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length);
  }

  return null;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Erreur realtime";
}

export function createRealtimeServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: validateCorsOrigin,
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = extractToken(socket);
      if (!token) {
        throw new Error("Token requis");
      }

      const payload = verifyToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          role: true,
          schoolId: true,
          isActive: true
        }
      });

      if (!user || !user.isActive) {
        throw new Error("Utilisateur invalide");
      }

      (socket as ChatSocket).data.actor = {
        id: user.id,
        role: user.role,
        schoolId: user.schoolId
      };

      next();
    } catch {
      next(new Error("Authentification realtime invalide"));
    }
  });

  io.on("connection", (socket) => {
    const chatSocket = socket as ChatSocket;
    const actor = chatSocket.data.actor;

    if (!actor) {
      socket.disconnect(true);
      return;
    }

    logger.info("realtime_connected", {
      socketId: socket.id,
      userId: actor.id
    });

    socket.on("chat:join", async (payload: { groupId?: string }, ack?: RealtimeAck) => {
      try {
        const groupId = typeof payload?.groupId === "string" ? payload.groupId : "";
        if (!groupId) {
          throw new Error("groupId requis");
        }

        await chatService.assertGroupAccess(groupId, actor);
        await socket.join(roomName(groupId));

        const messages = await chatService.listMessages(groupId, actor, 100);
        safeAck(ack, {
          ok: true,
          data: { messages }
        });
      } catch (error) {
        safeAck(ack, {
          ok: false,
          error: errorMessage(error)
        });
      }
    });

    socket.on("chat:leave", async (payload: { groupId?: string }, ack?: RealtimeAck) => {
      try {
        const groupId = typeof payload?.groupId === "string" ? payload.groupId : "";
        if (!groupId) {
          throw new Error("groupId requis");
        }

        await socket.leave(roomName(groupId));
        safeAck(ack, {
          ok: true
        });
      } catch (error) {
        safeAck(ack, {
          ok: false,
          error: errorMessage(error)
        });
      }
    });

    socket.on("chat:message:send", async (payload: { groupId?: string; content?: string }, ack?: RealtimeAck) => {
      try {
        const groupId = typeof payload?.groupId === "string" ? payload.groupId : "";
        const content = typeof payload?.content === "string" ? payload.content : "";

        if (!groupId) {
          throw new Error("groupId requis");
        }

        const message = await chatService.postMessage(groupId, { content }, actor);
        io.to(roomName(groupId)).emit("chat:message:new", message);

        safeAck(ack, {
          ok: true,
          data: { message }
        });
      } catch (error) {
        safeAck(ack, {
          ok: false,
          error: errorMessage(error)
        });
      }
    });

    socket.on("chat:message:delete", async (payload: { messageId?: string }, ack?: RealtimeAck) => {
      try {
        const messageId = typeof payload?.messageId === "string" ? payload.messageId : "";
        if (!messageId) {
          throw new Error("messageId requis");
        }

        const deleted = await chatService.deleteMessage(messageId, actor);
        io.to(roomName(deleted.groupId)).emit("chat:message:deleted", {
          messageId: deleted.id,
          groupId: deleted.groupId
        });

        safeAck(ack, {
          ok: true,
          data: {
            messageId: deleted.id
          }
        });
      } catch (error) {
        safeAck(ack, {
          ok: false,
          error: errorMessage(error)
        });
      }
    });

    socket.on("disconnect", (reason) => {
      logger.info("realtime_disconnected", {
        socketId: socket.id,
        userId: actor.id,
        reason
      });
    });
  });

  return io;
}

export type RealtimeServer = ReturnType<typeof createRealtimeServer>;

export function anonSessionId(ip: string | undefined) {
  const value = ip || "unknown";
  return createHash("sha256").update(value).digest("hex");
}
