import { OpenAPIRegistry, OpenApiGeneratorV31, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { reserveSchema, purchaseSchema, directPurchaseSchema } from '../validations/reservation.validation';
import { googleSignInSchema, loginSchema, registerSchema } from '../validations/auth.validation';
import { categoryParamsSchema, createCategorySchema, updateCategorySchema } from '../validations/category.validation';
import { concertParamsSchema, createConcertSchema, updateConcertSchema } from '../validations/concert.validation';
import { registerNotificationTokenSchema, removeNotificationTokenSchema } from '../validations/notification.validation';
import { createSingerSchema, singerParamsSchema, updateSingerSchema } from '../validations/singer.validation';
import { createTicketSchema, ticketParamsSchema, updateTicketSchema } from '../validations/ticket.validation';
import { updateUserSchema, userParamsSchema } from '../validations/user.validation';

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

const CategoryDtoSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
  })
  .openapi('CategoryDto');

const SingerDtoSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    title: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi('SingerDto');

const ConcertDtoSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string(),
    venue: z.string(),
    startsAt: z.string().datetime(),
    categoryId: z.string().uuid().nullable(),
    category: CategoryDtoSchema.nullable(),
    singerIds: z.array(z.string().uuid()),
    singers: z.array(SingerDtoSchema),
    availableStock: z.number().int().nonnegative(),
    totalStock: z.number().int().nonnegative(),
  })
  .openapi('ConcertDto');

const UserDtoSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email(),
    role: z.enum(['USER', 'ADMIN']),
    status: z.enum(['ACTIVE', 'DISABLED']),
    name: z.string().nullable(),
    pictureUrl: z.string().url().nullable(),
    emailVerified: z.boolean(),
    lastLoginAt: z.string().datetime(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi('UserDto');

const AuthUserResponseSchema = z
  .object({
    user: UserDtoSchema,
  })
  .openapi('AuthUserResponse');

const SignOutResultSchema = z
  .object({
    signedOut: z.boolean(),
  })
  .openapi('SignOutResult');

const NotificationDeviceDtoSchema = z
  .object({
    id: z.string().uuid(),
    platform: z.enum(['web', 'android', 'ios']).nullable(),
    enabled: z.boolean(),
    lastSeenAt: z.string().datetime(),
  })
  .openapi('NotificationDeviceDto');

const NotificationTokenDisabledSchema = z
  .object({
    disabled: z.boolean(),
  })
  .openapi('NotificationTokenDisabled');

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

const DeleteResultSchema = z
  .object({
    deleted: z.literal(true),
  })
  .openapi('DeleteResult');

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
    method: 'post',
    path: '/auth/register',
    tags: ['Auth'],
    summary: 'Register with email and password',
    request: {
      body: {
        required: true,
        content: { 'application/json': { schema: registerSchema } },
      },
    },
    responses: {
      201: jsonResponse('Registered', envelope(AuthUserResponseSchema)),
      400: errorResponse('Validation error'),
      409: errorResponse('Email already exists'),
      429: errorResponse('Rate limit exceeded'),
      500: errorResponse('Internal error'),
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/auth/login',
    tags: ['Auth'],
    summary: 'Sign in with email and password',
    request: {
      body: {
        required: true,
        content: { 'application/json': { schema: loginSchema } },
      },
    },
    responses: {
      200: jsonResponse('Signed in', envelope(AuthUserResponseSchema)),
      400: errorResponse('Validation error'),
      401: errorResponse('Invalid credentials or disabled account'),
      429: errorResponse('Rate limit exceeded'),
      500: errorResponse('Internal error'),
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/auth/google',
    tags: ['Auth'],
    summary: 'Verify Google ID token and set JWT auth cookie',
    request: {
      body: {
        required: true,
        content: { 'application/json': { schema: googleSignInSchema } },
      },
    },
    responses: {
      200: jsonResponse('Signed in', envelope(AuthUserResponseSchema)),
      400: errorResponse('Validation error'),
      401: errorResponse('Invalid Google token'),
      429: errorResponse('Rate limit exceeded'),
      500: errorResponse('Internal error'),
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/auth/me',
    tags: ['Auth'],
    summary: 'Return current authenticated user',
    responses: {
      200: jsonResponse('Current user', envelope(AuthUserResponseSchema)),
      401: errorResponse('Authentication required'),
      429: errorResponse('Rate limit exceeded'),
      500: errorResponse('Internal error'),
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/auth/logout',
    tags: ['Auth'],
    summary: 'Clear JWT auth cookie',
    responses: {
      200: jsonResponse('Signed out', envelope(SignOutResultSchema)),
      429: errorResponse('Rate limit exceeded'),
      500: errorResponse('Internal error'),
    },
  });

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
    method: 'post',
    path: '/concerts',
    tags: ['Concerts'],
    summary: 'Create a concert (admin)',
    request: {
      body: {
        required: true,
        content: { 'application/json': { schema: createConcertSchema } },
      },
    },
    responses: {
      201: jsonResponse('Concert created', envelope(ConcertDtoSchema)),
      400: errorResponse('Validation error'),
      401: errorResponse('Authentication required'),
      403: errorResponse('Admin access required'),
      500: errorResponse('Internal error'),
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/categories',
    tags: ['Categories'],
    summary: 'List concert categories',
    responses: {
      200: jsonResponse('Category list', envelope(z.array(CategoryDtoSchema))),
      500: errorResponse('Internal error'),
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/categories',
    tags: ['Categories'],
    summary: 'Create a concert category (admin)',
    request: {
      body: {
        required: true,
        content: { 'application/json': { schema: createCategorySchema } },
      },
    },
    responses: {
      201: jsonResponse('Category created', envelope(CategoryDtoSchema)),
      400: errorResponse('Validation error'),
      401: errorResponse('Authentication required'),
      403: errorResponse('Admin access required'),
      409: errorResponse('Category slug already exists'),
      500: errorResponse('Internal error'),
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/categories/{id}',
    tags: ['Categories'],
    summary: 'Get a concert category by id',
    request: {
      params: categoryParamsSchema,
    },
    responses: {
      200: jsonResponse('Category', envelope(CategoryDtoSchema)),
      400: errorResponse('Validation error'),
      404: errorResponse('Category not found'),
      500: errorResponse('Internal error'),
    },
  });

  registry.registerPath({
    method: 'patch',
    path: '/categories/{id}',
    tags: ['Categories'],
    summary: 'Update a concert category (admin)',
    request: {
      params: categoryParamsSchema,
      body: {
        required: true,
        content: { 'application/json': { schema: updateCategorySchema } },
      },
    },
    responses: {
      200: jsonResponse('Category updated', envelope(CategoryDtoSchema)),
      400: errorResponse('Validation error'),
      401: errorResponse('Authentication required'),
      403: errorResponse('Admin access required'),
      404: errorResponse('Category not found'),
      409: errorResponse('Category slug already exists'),
      500: errorResponse('Internal error'),
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/categories/{id}',
    tags: ['Categories'],
    summary: 'Delete a concert category and clear it from concerts (admin)',
    request: {
      params: categoryParamsSchema,
    },
    responses: {
      200: jsonResponse('Category deleted', envelope(DeleteResultSchema)),
      400: errorResponse('Validation error'),
      401: errorResponse('Authentication required'),
      403: errorResponse('Admin access required'),
      404: errorResponse('Category not found'),
      500: errorResponse('Internal error'),
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/concerts/{id}',
    tags: ['Concerts'],
    summary: 'Get a concert by id with stock totals',
    request: {
      params: concertParamsSchema,
    },
    responses: {
      200: jsonResponse('Concert', envelope(ConcertDtoSchema)),
      400: errorResponse('Validation error'),
      404: errorResponse('Concert not found'),
      500: errorResponse('Internal error'),
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/singers',
    tags: ['Singers'],
    summary: 'List singers',
    responses: {
      200: jsonResponse('Singer list', envelope(z.array(SingerDtoSchema))),
      500: errorResponse('Internal error'),
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/singers',
    tags: ['Singers'],
    summary: 'Create a singer (admin)',
    request: {
      body: {
        required: true,
        content: { 'application/json': { schema: createSingerSchema } },
      },
    },
    responses: {
      201: jsonResponse('Singer created', envelope(SingerDtoSchema)),
      400: errorResponse('Validation error'),
      401: errorResponse('Authentication required'),
      403: errorResponse('Admin access required'),
      500: errorResponse('Internal error'),
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/singers/{id}',
    tags: ['Singers'],
    summary: 'Get a singer by id',
    request: {
      params: singerParamsSchema,
    },
    responses: {
      200: jsonResponse('Singer', envelope(SingerDtoSchema)),
      400: errorResponse('Validation error'),
      404: errorResponse('Singer not found'),
      500: errorResponse('Internal error'),
    },
  });

  registry.registerPath({
    method: 'patch',
    path: '/singers/{id}',
    tags: ['Singers'],
    summary: 'Update a singer (admin)',
    request: {
      params: singerParamsSchema,
      body: {
        required: true,
        content: { 'application/json': { schema: updateSingerSchema } },
      },
    },
    responses: {
      200: jsonResponse('Singer updated', envelope(SingerDtoSchema)),
      400: errorResponse('Validation error'),
      401: errorResponse('Authentication required'),
      403: errorResponse('Admin access required'),
      404: errorResponse('Singer not found'),
      500: errorResponse('Internal error'),
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/singers/{id}',
    tags: ['Singers'],
    summary: 'Delete a singer and remove concert assignments (admin)',
    request: {
      params: singerParamsSchema,
    },
    responses: {
      200: jsonResponse('Singer deleted', envelope(DeleteResultSchema)),
      400: errorResponse('Validation error'),
      401: errorResponse('Authentication required'),
      403: errorResponse('Admin access required'),
      404: errorResponse('Singer not found'),
      500: errorResponse('Internal error'),
    },
  });

  registry.registerPath({
    method: 'patch',
    path: '/concerts/{id}',
    tags: ['Concerts'],
    summary: 'Update a concert (admin)',
    request: {
      params: concertParamsSchema,
      body: {
        required: true,
        content: { 'application/json': { schema: updateConcertSchema } },
      },
    },
    responses: {
      200: jsonResponse('Concert updated', envelope(ConcertDtoSchema)),
      400: errorResponse('Validation error'),
      401: errorResponse('Authentication required'),
      403: errorResponse('Admin access required'),
      404: errorResponse('Concert not found'),
      500: errorResponse('Internal error'),
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/concerts/{id}',
    tags: ['Concerts'],
    summary: 'Delete a concert and related inventory/reservations (admin)',
    request: {
      params: concertParamsSchema,
    },
    responses: {
      200: jsonResponse('Concert deleted', envelope(DeleteResultSchema)),
      400: errorResponse('Validation error'),
      401: errorResponse('Authentication required'),
      403: errorResponse('Admin access required'),
      404: errorResponse('Concert not found'),
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
      401: errorResponse('Authentication required'),
      403: errorResponse('Admin access required'),
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/tickets/{id}',
    tags: ['Tickets'],
    summary: 'Get ticket inventory by id',
    request: {
      params: ticketParamsSchema,
    },
    responses: {
      200: jsonResponse('Ticket inventory', envelope(TicketDtoSchema)),
      400: errorResponse('Validation error'),
      404: errorResponse('Ticket not found'),
      500: errorResponse('Internal error'),
    },
  });

  registry.registerPath({
    method: 'patch',
    path: '/tickets/{id}',
    tags: ['Tickets'],
    summary: 'Update ticket inventory (admin)',
    request: {
      params: ticketParamsSchema,
      body: {
        required: true,
        content: { 'application/json': { schema: updateTicketSchema } },
      },
    },
    responses: {
      200: jsonResponse('Ticket inventory updated', envelope(TicketDtoSchema)),
      400: errorResponse('Validation error'),
      401: errorResponse('Authentication required'),
      403: errorResponse('Admin access required'),
      404: errorResponse('Ticket not found'),
      409: errorResponse('Stock conflict'),
      500: errorResponse('Internal error'),
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/tickets/{id}',
    tags: ['Tickets'],
    summary: 'Delete ticket inventory (admin)',
    request: {
      params: ticketParamsSchema,
    },
    responses: {
      200: jsonResponse('Ticket inventory deleted', envelope(DeleteResultSchema)),
      400: errorResponse('Validation error'),
      401: errorResponse('Authentication required'),
      403: errorResponse('Admin access required'),
      404: errorResponse('Ticket not found'),
      409: errorResponse('Pending reservations exist'),
      500: errorResponse('Internal error'),
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
      401: errorResponse('Authentication required'),
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
      401: errorResponse('Authentication required'),
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
      401: errorResponse('Authentication required'),
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
      401: errorResponse('Authentication required'),
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

  registry.registerPath({
    method: 'post',
    path: '/notifications/register-token',
    tags: ['Notifications'],
    summary: 'Register or refresh an FCM token for the current user',
    request: {
      body: {
        required: true,
        content: { 'application/json': { schema: registerNotificationTokenSchema } },
      },
    },
    responses: {
      200: jsonResponse('Notification token registered', envelope(NotificationDeviceDtoSchema)),
      400: errorResponse('Validation error'),
      401: errorResponse('Authentication required'),
      429: errorResponse('Rate limit exceeded'),
      500: errorResponse('Internal error'),
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/notifications/register-token',
    tags: ['Notifications'],
    summary: 'Disable an FCM token for the current user',
    request: {
      body: {
        required: true,
        content: { 'application/json': { schema: removeNotificationTokenSchema } },
      },
    },
    responses: {
      200: jsonResponse('Notification token disabled', envelope(NotificationTokenDisabledSchema)),
      400: errorResponse('Validation error'),
      401: errorResponse('Authentication required'),
      429: errorResponse('Rate limit exceeded'),
      500: errorResponse('Internal error'),
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/users',
    tags: ['Users'],
    summary: 'List users (admin)',
    responses: {
      200: jsonResponse('User list', envelope(z.array(UserDtoSchema))),
      401: errorResponse('Authentication required'),
      403: errorResponse('Admin access required'),
      500: errorResponse('Internal error'),
    },
  });

  registry.registerPath({
    method: 'patch',
    path: '/users/{id}',
    tags: ['Users'],
    summary: 'Update a user (admin)',
    request: {
      params: userParamsSchema,
      body: {
        required: true,
        content: { 'application/json': { schema: updateUserSchema } },
      },
    },
    responses: {
      200: jsonResponse('User updated', envelope(UserDtoSchema)),
      400: errorResponse('Validation error'),
      401: errorResponse('Authentication required'),
      403: errorResponse('Admin access required'),
      404: errorResponse('User not found'),
      409: errorResponse('Email already exists'),
      500: errorResponse('Internal error'),
    },
  });

  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Concert Tickets API',
      version: '1.0.0',
      description: 'Day 3 hardened ticket reservation backend. Errors return `{ error, message, ref }` envelope; every response carries `X-Correlation-ID`.',
    },
    servers: [{ url: '/api/v1' }],
    tags: [{ name: 'Auth' }, { name: 'Categories' }, { name: 'Concerts' }, { name: 'Singers' }, { name: 'Tickets' }, { name: 'Reservations' }, { name: 'Purchase' }, { name: 'Notifications' }, { name: 'Users' }, { name: 'Operations' }],
  });
}
