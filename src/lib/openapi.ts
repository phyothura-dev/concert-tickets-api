import { OpenAPIRegistry, OpenApiGeneratorV31, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { reserveSchema, purchaseSchema, directPurchaseSchema } from '../validations/reservation.validation';
import { createTicketSchema } from '../validations/ticket.validation';

extendZodWithOpenApi(z);

const ErrorEnvelopeSchema = z
  .object({
    error: z.string().openapi({ example: 'CONFLICT_CODE' }),
    message: z.string().openapi({ example: 'User-friendly explanation' }),
    ref: z.string().openapi({ example: '8b1f6e0a-4b3f-4f1e-9a44-1c2c1bda3df2' }),
    details: z.unknown().optional(),
  })
  .openapi('ErrorEnvelope');

const SuccessEnvelopeSchema = z
  .object({
    status: z.literal('success'),
    message: z.string(),
    data: z.unknown(),
  })
  .openapi('SuccessEnvelope');

const TicketDtoSchema = z
  .object({
    id: z.string().uuid(),
    concertId: z.string().uuid(),
    totalStock: z.number().int().nonnegative(),
    remainingStock: z.number().int().nonnegative(),
    price: z.number().int().nonnegative(),
    type: z.enum(['VIP', 'NORMAL']),
  })
  .openapi('TicketDto');

const ConcertDtoSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string(),
    venue: z.string(),
    startsAt: z.string().datetime(),
    availableStock: z.number().int().nonnegative(),
    totalStock: z.number().int().nonnegative(),
  })
  .openapi('ConcertDto');

const ReservationCreatedSchema = z
  .object({
    reservationId: z.string().uuid(),
    expiresAt: z.string().datetime(),
  })
  .openapi('ReservationCreated');

const PurchaseResultSchema = z
  .object({
    reservationId: z.string().uuid(),
    concertId: z.string().uuid(),
    quantity: z.number().int().positive(),
    remainingStock: z.number().int().nonnegative(),
    method: z.enum(['OPTIMISTIC', 'PESSIMISTIC']),
  })
  .openapi('PurchaseResult');

const LegacyPurchaseResultSchema = z
  .object({
    reservationId: z.string().uuid(),
    status: z.literal('PURCHASED'),
  })
  .openapi('LegacyPurchaseResult');

const CleanupResultSchema = z
  .object({
    expired: z.number().int().nonnegative(),
  })
  .openapi('CleanupResult');

function envelope<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    status: z.literal('success'),
    message: z.string(),
    data: dataSchema,
  });
}

const errorResponse = (description: string) => ({
  description,
  content: {
    'application/json': {
      schema: ErrorEnvelopeSchema,
    },
  },
});

const jsonResponse = (description: string, schema: z.ZodTypeAny) => ({
  description,
  content: {
    'application/json': {
      schema,
    },
  },
});

export function buildOpenApiDocument(): ReturnType<OpenApiGeneratorV31['generateDocument']> {
  const registry = new OpenAPIRegistry();

  registry.register('SuccessEnvelope', SuccessEnvelopeSchema);
  registry.register('ErrorEnvelope', ErrorEnvelopeSchema);

  registry.registerPath({
    method: 'get',
    path: '/concerts',
    tags: ['Concerts'],
    summary: 'List concerts with stock totals',
    responses: {
      200: jsonResponse('Concert list', envelope(z.array(ConcertDtoSchema))),
      500: errorResponse('Internal error'),
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/tickets',
    tags: ['Tickets'],
    summary: 'List ticket inventories ',
    responses: {
      200: jsonResponse('Ticket list', envelope(z.array(TicketDtoSchema))),
      500: errorResponse('Internal error'),
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/tickets',
    tags: ['Tickets'],
    summary: 'Create ticket inventory for a concert (admin)',
    request: {
      body: {
        required: true,
        content: { 'application/json': { schema: createTicketSchema } },
      },
    },
    responses: {
      201: jsonResponse('Ticket inventory created', envelope(TicketDtoSchema)),
      400: errorResponse('Validation error'),
      404: errorResponse('Concert not found'),
      409: errorResponse('Ticket inventory already exists for concert'),
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/reserve',
    tags: ['Reservations'],
    summary: 'Reserve tickets (rate-limited: 5 req/min/IP)',
    request: {
      body: {
        required: true,
        content: { 'application/json': { schema: reserveSchema } },
      },
    },
    responses: {
      201: jsonResponse('Reservation created', envelope(ReservationCreatedSchema)),
      400: errorResponse('Validation error'),
      404: errorResponse('Concert/ticket not found'),
      409: errorResponse('Conflict (e.g. NOT_ENOUGH_STOCK)'),
      429: errorResponse('Rate limit exceeded'),
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/purchase',
    tags: ['Reservations'],
    summary: 'Legacy reservation-based purchase (PENDING -> PURCHASED)',
    request: {
      body: {
        required: true,
        content: { 'application/json': { schema: purchaseSchema } },
      },
    },
    responses: {
      200: jsonResponse('Reservation purchased', envelope(LegacyPurchaseResultSchema)),
      400: errorResponse('Validation error'),
      404: errorResponse('Reservation not found'),
      409: errorResponse('Reservation not pending or expired'),
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/purchase/optimistic',
    tags: ['Purchase'],
    summary: 'Direct purchase using optimistic locking (@VersionColumn on Ticket)',
    request: {
      body: {
        required: true,
        content: { 'application/json': { schema: directPurchaseSchema } },
      },
    },
    responses: {
      200: jsonResponse('Ticket purchased', envelope(PurchaseResultSchema)),
      400: errorResponse('Validation error'),
      404: errorResponse('Ticket not found'),
      409: errorResponse('VERSION_CONFLICT or NOT_ENOUGH_STOCK'),
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/purchase/pessimistic',
    tags: ['Purchase'],
    summary: 'Direct purchase using pessimistic locking (SQLite BEGIN IMMEDIATE)',
    request: {
      body: {
        required: true,
        content: { 'application/json': { schema: directPurchaseSchema } },
      },
    },
    responses: {
      200: jsonResponse('Ticket purchased', envelope(PurchaseResultSchema)),
      400: errorResponse('Validation error'),
      404: errorResponse('Ticket not found'),
      409: errorResponse('LOCK_CONFLICT or NOT_ENOUGH_STOCK'),
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/cleanup',
    tags: ['Operations'],
    summary: 'Sweep expired pending reservations and restore stock',
    responses: {
      200: jsonResponse('Cleanup completed', envelope(CleanupResultSchema)),
    },
  });

  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Ticket Reservation API',
      version: '1.0.0',
      description: 'Day 3 hardened ticket reservation backend. Errors return `{ error, message, ref }` envelope; every response carries `X-Correlation-ID`.',
    },
    servers: [{ url: '/' }],
    tags: [{ name: 'Concerts' }, { name: 'Tickets' }, { name: 'Reservations' }, { name: 'Purchase' }, { name: 'Operations' }],
  });
}
