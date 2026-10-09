import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import multer from "multer";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (res.headersSent) {
    res.end();
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: err.issues
        .map((i) => i.path.join(".") + ": " + i.message)
        .join("; "),
    });
    return;
  }
  if (err instanceof multer.MulterError) {
    res
      .status(400)
      .json({ error: "Choose one photo per request, no larger than 10 MB." });
    return;
  }
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ error: "Invalid JSON body." });
    return;
  }
  const code = (err as { code?: string })?.code;
  if (code === "23505") {
    res.status(409).json({
      error: "This record already exists or a request is already pending.",
    });
    return;
  }
  console.error({
    requestId: req.requestId,
    error: err instanceof Error ? err.message : "Unexpected error",
  });
  res.status(500).json({
    error: "The request could not be completed.",
    requestId: req.requestId,
  });
}
