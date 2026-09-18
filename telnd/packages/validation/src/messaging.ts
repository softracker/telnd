import { z } from 'zod';

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  type: z.enum(['text', 'image', 'file', 'voice']).default('text'),
  content: z.string().max(5000).optional(),
  fileUrl: z.string().url().optional(),
  fileName: z.string().max(255).optional(),
  fileSize: z.number().int().positive().optional(),
  replyToId: z.string().uuid().optional(),
});

export const createConversationSchema = z.object({
  participantIds: z.array(z.string().uuid()).min(1).max(10),
});

export const addReactionSchema = z.object({
  messageId: z.string().uuid(),
  emoji: z.string().max(10),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type AddReactionInput = z.infer<typeof addReactionSchema>;
