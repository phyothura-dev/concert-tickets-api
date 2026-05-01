import { type NextFunction, type Request, type RequestHandler, type Response } from 'express';

export type AsyncRequestHandler<Params = Record<string, string>, ResBody = unknown, ReqBody = unknown, ReqQuery = Record<string, string>> = (
  req: Request<Params, ResBody, ReqBody, ReqQuery>,
  res: Response<ResBody>,
  next: NextFunction,
) => Promise<unknown>;

export function asyncHandler<Params = Record<string, string>, ResBody = unknown, ReqBody = unknown, ReqQuery = Record<string, string>>(
  handler: AsyncRequestHandler<Params, ResBody, ReqBody, ReqQuery>,
): RequestHandler<Params, ResBody, ReqBody, ReqQuery> {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
