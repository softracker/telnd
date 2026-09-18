import { z } from 'zod';

export const supportTicketSchema = z.object({
  subject: z.string().min(5).max(200),
  description: z.string().min(20).max(5000),
  category: z.string().min(1).max(50),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
});

export const supportMessageSchema = z.object({
  ticketId: z.string().min(1),
  content: z.string().min(1).max(5000),
  isInternal: z.boolean().default(false),
  attachments: z.array(z.object({
    url: z.string().url(),
    filename: z.string().min(1),
    mimeType: z.string().min(1),
    size: z.number().min(0),
  })).optional(),
});

export const ticketUpdateSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedTo: z.string().optional(),
});

export const ticketQuerySchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  category: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

export type SupportTicketInput = z.infer<typeof supportTicketSchema>;
export type SupportMessageInput = z.infer<typeof supportMessageSchema>;
export type TicketUpdateInput = z.infer<typeof ticketUpdateSchema>;
