import { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface AuthUser {
      id: string;
      role: Role;
      schoolId: string | null;
    }

    interface Request {
      user?: AuthUser;
      requestId?: string;
    }
  }
}

export {};
