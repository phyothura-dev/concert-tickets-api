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

function makeValidator(source: Source) {
  return <T>(schema: ZodType<T>): RequestHandler => {
    return (req: Request, _res: Response, next: NextFunction) => {
      const result = schema.safeParse(req[source]);
      if (!result.success) {
        const firstMessage = result.error.issues[0]?.message ?? 'Invalid payload';
        next(new ValidationError(firstMessage, buildIssueDetails(result.error), 'VALIDATION_ERROR'));
        return;
      }
      Object.defineProperty(req, source, {
        value: result.data,
        writable: true,
        configurable: true,
        enumerable: true,
      });
      next();
    };
  };
}

export const validateBody = makeValidator('body');
export const validateQuery = makeValidator('query');
export const validateParams = makeValidator('params');
