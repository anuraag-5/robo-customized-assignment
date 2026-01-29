import type { NextFunction, Request, Response } from "express";
import { auth } from "./lib/auth";

export const requireAuth = async (req: Request, res: Response, next: NextFunction ) => {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.user = session.user;
  next()
};
