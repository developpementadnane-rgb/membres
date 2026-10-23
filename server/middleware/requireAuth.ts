import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Express.Request {
  user_id: string;
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const authorization = req.header("authorization");
  const [scheme, token] = authorization?.split(" ") ?? [];
  const secret = process.env.JWT_SECRET;

  if (scheme !== "Bearer" || !token || !secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, secret);
    if (typeof payload !== "object" || !payload || typeof payload.user_id !== "string") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    (req as unknown as AuthenticatedRequest).user_id = payload.user_id;
    return next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
};
