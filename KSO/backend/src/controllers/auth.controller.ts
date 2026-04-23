import { Request, Response } from "express";

import { env } from "../config/env";
import { authService, REFRESH_COOKIE_NAME } from "../services/auth.service";
import { asyncHandler } from "../utils/async-handler";
import { parseDurationToMs } from "../utils/duration";

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.AUTH_COOKIE_SECURE,
    sameSite: env.AUTH_COOKIE_SAME_SITE,
    domain: env.AUTH_COOKIE_DOMAIN || undefined,
    path: "/api/auth",
    maxAge: parseDurationToMs(env.REFRESH_TOKEN_EXPIRES_IN, 30 * 24 * 60 * 60 * 1000)
  } as const;
}

function sessionMeta(req: Request) {
  return {
    ipAddress: req.ip,
    userAgent: req.get("user-agent")
  };
}

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const data = await authService.register(req.body, req.user, sessionMeta(req));

    res.cookie(REFRESH_COOKIE_NAME, data.refreshToken, refreshCookieOptions());
    res.status(201).json({
      accessToken: data.accessToken,
      token: data.token,
      user: data.user
    });
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const data = await authService.login(req.body.email, req.body.password, sessionMeta(req));

    res.cookie(REFRESH_COOKIE_NAME, data.refreshToken, refreshCookieOptions());
    res.json({
      accessToken: data.accessToken,
      token: data.token,
      user: data.user
    });
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    const data = await authService.refresh(refreshToken, sessionMeta(req));

    res.cookie(REFRESH_COOKIE_NAME, data.refreshToken, refreshCookieOptions());
    res.json({
      accessToken: data.accessToken,
      token: data.token,
      user: data.user
    });
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    await authService.logout(refreshToken);

    res.clearCookie(REFRESH_COOKIE_NAME, {
      ...refreshCookieOptions(),
      maxAge: undefined
    });
    res.status(204).send();
  }),

  forgotPassword: asyncHandler(async (req: Request, res: Response) => {
    const data = await authService.forgotPassword(req.body.email);
    res.json(data);
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    const data = await authService.resetPassword(req.body.token, req.body.password);
    res.json(data);
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    const data = await authService.me(req.user!.id);
    res.json(data);
  })
};
