import { z } from 'zod';

export const concertPerformanceSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  venue: z.string(),
  startsAt: z.string(),
  totalStock: z.number().int(),
  availableStock: z.number().int(),
  soldStock: z.number().int(),
  revenue: z.number().int(),
  occupancyRate: z.number(),
});

export const dashboardMetricsSchema = z.object({
  summary: z.object({
    totalRevenue: z.number().int(),
    ticketsSold: z.number().int(),
    activeConcerts: z.number().int(),
    registeredUsers: z.number().int(),
  }),
  concertPerformance: z.array(concertPerformanceSchema),
});

export type ConcertPerformance = z.infer<typeof concertPerformanceSchema>;
export type DashboardMetrics = z.infer<typeof dashboardMetricsSchema>;
