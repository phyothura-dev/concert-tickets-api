import swaggerUi from 'swagger-ui-express';
import { Router } from 'express';
import { buildOpenApiDocument } from '../lib/openapi';

export function createSwaggerRouter(): Router {
  const router = Router();
  const document = buildOpenApiDocument();

  router.get('/openapi.json', (_req, res) => {
    res.json(document);
  });

  router.use('/', swaggerUi.serve);
  router.get('/', swaggerUi.setup(document, { customSiteTitle: 'Ticket Reservation API' }));

  return router;
}
