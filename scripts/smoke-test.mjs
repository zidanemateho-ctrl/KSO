import { spawn } from "node:child_process";
import { once } from "node:events";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";
import util from "node:util";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const backendDir = path.join(repoRoot, "backend");

const smokeBaseUrl = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:4100";
const smokePort = new URL(smokeBaseUrl).port || "4100";

if (!process.env.DATABASE_URL) {
  console.error("[smoke] DATABASE_URL is required.");
  process.exit(1);
}

if (process.env.DATABASE_URL.startsWith("file:")) {
  console.error("[smoke] DATABASE_URL must target PostgreSQL for smoke tests.");
  process.exit(1);
}

async function assertDatabaseTcpReachable(databaseUrl) {
  const parsed = new URL(databaseUrl);
  const host = parsed.hostname;
  const port = Number(parsed.port || "5432");

  await new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });

    socket.once("connect", () => {
      socket.end();
      resolve();
    });

    socket.once("error", (error) => {
      socket.destroy();
      reject(error);
    });

    socket.setTimeout(3000, () => {
      socket.destroy();
      reject(new Error(`timeout reaching ${host}:${port}`));
    });
  });
}

const env = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV ?? "test",
  PORT: process.env.PORT ?? smokePort,
  FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:5173",
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL ?? smokeBaseUrl,
  JWT_SECRET: process.env.JWT_SECRET ?? "ci_access_secret_very_long_for_tests_only_12345",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? "ci_refresh_secret_very_long_for_tests_only_12345",
  AUTH_COOKIE_SECURE: process.env.AUTH_COOKIE_SECURE ?? "false",
  AUTH_COOKIE_SAME_SITE: process.env.AUTH_COOKIE_SAME_SITE ?? "lax",
  FILE_STORAGE_DRIVER: process.env.FILE_STORAGE_DRIVER ?? "local"
};

const server = spawn(process.execPath, ["dist/server.js"], {
  cwd: backendDir,
  env,
  stdio: "inherit"
});

let exited = false;
server.on("exit", () => {
  exited = true;
});

async function isHealthy(pathname) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${smokeBaseUrl}${pathname}`, {
      signal: controller.signal
    });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForHealthy(pathname, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (exited) {
      throw new Error(`[smoke] Backend process exited before ${pathname} was ready.`);
    }

    const ok = await isHealthy(pathname);
    if (ok) {
      return;
    }

    await sleep(1000);
  }

  throw new Error(`[smoke] Timeout waiting for ${pathname}.`);
}

async function shutdown() {
  if (exited) {
    return;
  }

  server.kill("SIGTERM");

  try {
    await Promise.race([once(server, "exit"), sleep(5000)]);
  } finally {
    if (!exited) {
      server.kill("SIGKILL");
    }
  }
}

try {
  await assertDatabaseTcpReachable(process.env.DATABASE_URL);
  await waitForHealthy("/health/live", 45_000);
  await waitForHealthy("/health/ready", 45_000);
  console.log("[smoke] Health endpoints are reachable.");
  await shutdown();
} catch (error) {
  if (error instanceof Error && error.message) {
    console.error(error.message);
  } else {
    console.error(util.inspect(error, { depth: 3, breakLength: 120 }));
  }
  await shutdown();
  process.exit(1);
}
