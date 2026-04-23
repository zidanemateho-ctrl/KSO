import jwt, { SignOptions } from "jsonwebtoken";

import { env } from "../config/env";

export interface AccessTokenPayload {
  sub: string;
  role: string;
  schoolId: string | null;
}

export function signAccessToken(payload: AccessTokenPayload) {
  const options: SignOptions = {
    expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as SignOptions["expiresIn"]
  };

  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
}

// Backward compatibility helpers.
export function signToken(payload: AccessTokenPayload) {
  return signAccessToken(payload);
}

export function verifyToken(token: string) {
  return verifyAccessToken(token);
}
