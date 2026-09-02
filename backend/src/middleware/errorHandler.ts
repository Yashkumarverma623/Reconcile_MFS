import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected error occurred';
  const requestId = (req.headers['x-request-id'] as string) || Math.random().toString(36).substring(7);

  if (statusCode === 500) {
    console.error('[SERVER ERROR]', err);
  }

  res.status(statusCode).json({
    error: {
      code,
      message,
      requestId,
    },
  });
};
