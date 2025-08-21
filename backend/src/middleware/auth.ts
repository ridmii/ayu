import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: string };
    }
  }
}

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  // Bypass authentication for demo
  req.user = { id: 'mock-user-id', role: 'admin' };
  next();
};