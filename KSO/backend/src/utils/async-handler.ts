import { NextFunction, Request, Response } from "express";

export function asyncHandler<T extends Request>(
  handler: (req: T, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: T, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}
