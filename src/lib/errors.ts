export type ErrorDetails = unknown;

export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;
  readonly details: ErrorDetails;
  readonly expose: boolean;

  constructor(message: string, details: ErrorDetails = null, expose = true) {
    super(message);
    this.name = new.target.name;
    this.details = details;
    this.expose = expose;
    Error.captureStackTrace?.(this, new.target);
  }
}

export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly code: string;

  constructor(message: string, details: ErrorDetails = null, code = 'VALIDATION_ERROR') {
    super(message, details);
    this.code = code;
  }
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code: string;

  constructor(message = 'Resource not found', details: ErrorDetails = null, code = 'NOT_FOUND') {
    super(message, details);
    this.code = code;
  }
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly code: string;

  constructor(code: string, message = 'Conflict', details: ErrorDetails = null) {
    super(message, details);
    this.code = code;
  }
}

export class RateLimitError extends AppError {
  readonly statusCode = 429;
  readonly code: string;

  constructor(message = 'Too many requests', details: ErrorDetails = null, code = 'RATE_LIMITED') {
    super(message, details);
    this.code = code;
  }
}

export class InternalError extends AppError {
  readonly statusCode = 500;
  readonly code: string;

  constructor(message = 'Internal server error', details: ErrorDetails = null, code = 'INTERNAL_ERROR') {
    super(message, details, false);
    this.code = code;
  }
}


export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
