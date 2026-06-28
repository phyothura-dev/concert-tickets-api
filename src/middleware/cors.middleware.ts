import { type NextFunction, type Request, type Response } from 'express';

const ALLOWED_METHODS = 'GET,POST,DELETE,OPTIONS';
const ALLOWED_HEADERS = 'Content-Type,X-Correlation-ID';

export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const frontendOrigin = process.env['FRONTEND_ORIGIN'];
  const requestOrigin = req.header('Origin');

  if (frontendOrigin && requestOrigin === frontendOrigin) {
    res.setHeader('Access-Control-Allow-Origin', frontendOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
    res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
    res.setHeader('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    res.status(204).send();
    return;
  }

  next();
}
