import { io } from "socket.io-client";

import { getAccessToken } from "../api/client";

function realtimeBaseUrl() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";
  return apiBaseUrl.endsWith("/api") ? apiBaseUrl.slice(0, -4) : apiBaseUrl;
}

export function createChatSocket() {
  const token = getAccessToken();

  return io(realtimeBaseUrl(), {
    transports: ["websocket", "polling"],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 500,
    reconnectionDelayMax: 4000,
    timeout: 12000,
    auth: {
      token
    }
  });
}
