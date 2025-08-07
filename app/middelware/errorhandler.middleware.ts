import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/unified.response";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // If it's a Zod error
  if (err.name === "ZodError") {
    console.log(err)
    return sendError(res, "Validation error", err, 400);
  }

  return sendError(res, message, err, statusCode);
};
