import axios, { AxiosRequestConfig } from "axios";

import { LoginResponse } from "../types/models";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

let accessToken: string | null = null;

export function storeAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<LoginResponse>("/auth/refresh")
      .then((response) => {
        const nextToken = response.data.accessToken || response.data.token || null;
        storeAccessToken(nextToken);
        return nextToken;
      })
      .catch(() => {
        storeAccessToken(null);
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const originalRequest = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const requestUrl = String(originalRequest?.url || "");

    const isAuthRoute =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/refresh");

    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;
      const refreshedToken = await refreshAccessToken();

      if (refreshedToken) {
        originalRequest.headers = {
          ...(originalRequest.headers || {}),
          Authorization: `Bearer ${refreshedToken}`
        };
        return api(originalRequest);
      }

      window.dispatchEvent(new CustomEvent("kso:auth-expired"));
    }

    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      "Une erreur est survenue. Veuillez reessayer.";

    return Promise.reject(new Error(message));
  }
);
