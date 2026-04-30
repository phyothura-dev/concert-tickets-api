import { type Response } from 'express';

export function success(res: Response, data: unknown = [], message = 'Success', statusCode = 200): void {
  res.status(statusCode).json({
    status: 'success',
    message,
    data,
  });
}

export function fail(res: Response, message = 'Error', statusCode = 500, errors: unknown = null): void {
  res.status(statusCode).json({
    status: 'error',
    message,
    errors,
  });
}
