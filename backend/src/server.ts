import { createServer, Server as HttpServer } from "http";

import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { prisma } from "./lib/prisma";
import { createRealtimeServer } from "./realtime/chat.gateway";

const app = createApp();
const httpServer = createServer(app);

createRealtimeServer(httpServer);

let shuttingDown = false;

async function shutdown(signal: string, server: HttpServer) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  logger.warn("shutdown_started", { signal });

  const forceCloseTimer = setTimeout(() => {
    logger.error("shutdown_forced", { signal });
    process.exit(1);
  }, 10_000);
  forceCloseTimer.unref();

  try {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  } catch (error) {
    logger.error("http_server_close_failed", {
      reason: error instanceof Error ? error.message : "unknown"
    });
  }

  try {
    await prisma.$disconnect();
  } catch (error) {
    logger.error("prisma_disconnect_failed", {
      reason: error instanceof Error ? error.message : "unknown"
    });
  }

  clearTimeout(forceCloseTimer);
  logger.info("shutdown_completed", { signal });
  process.exit(0);
}

async function bootstrap() {
  try {
    await prisma.$connect();

    httpServer.listen(env.PORT, () => {
      logger.info("server_started", {
        port: env.PORT,
        nodeEnv: env.NODE_ENV,
        apiBasePath: "/api"
      });
    });
  } catch (error) {
    logger.error("bootstrap_failed", {
      reason: error instanceof Error ? error.message : "unknown"
    });
    process.exit(1);
  }
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM", httpServer);
});

process.on("SIGINT", () => {
  void shutdown("SIGINT", httpServer);
});

process.on("unhandledRejection", (reason) => {
  logger.error("unhandled_rejection", {
    reason: reason instanceof Error ? { message: reason.message, stack: reason.stack } : String(reason)
  });
});

process.on("uncaughtException", (error) => {
  logger.error("uncaught_exception", {
    message: error.message,
    stack: error.stack
  });
  void shutdown("UNCAUGHT_EXCEPTION", httpServer);
});

void bootstrap();
