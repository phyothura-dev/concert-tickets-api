import { type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { ZodError, type ZodIssue, type ZodType } from 'zod';
import { ValidationError } from '../lib/errors';

type Source = 'body' | 'query' | 'params';

function buildIssueDetails(error: ZodError): Array<{ path: string; message: string; code: string }> {
  return error.issues.map((issue: ZodIssue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));
}

export function parseSchema<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    const firstMessage = result.error.issues[0]?.message ?? 'Invalid payload';
    throw new ValidationError(firstMessage, buildIssueDetails(result.error), 'VALIDATION_ERROR');
  }
  return result.data;
}

function makeValidator(source: Source) {
  return <T>(schema: ZodType<T>): RequestHandler => {
    return (req: Request, _res: Response, next: NextFunction) => {
      try {
        Object.defineProperty(req, source, {
          value: parseSchema(schema, req[source]),
          writable: true,
          configurable: true,
          enumerable: true,
        });
        next();
      } catch (error) {
        next(error);
      }
    };
  };
}

export const validateBody = makeValidator('body');
export const validateQuery = makeValidator('query');
export const validateParams = makeValidator('params');
