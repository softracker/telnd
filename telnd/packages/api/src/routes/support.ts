import { Hono } from 'hono';
import { prisma } from '@telnd/database';
import { validate } from '../middleware/validate';
import { roleGuard, requireAdmin, requirePermission } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { supportTicketSchema, supportMessageSchema, ticketUpdateSchema } from '@telnd/validation';

type SupportEnv = {
  Variables: {
    user: any;
    userId: string;
    validatedData: any;
  };
};

const support = new Hono<SupportEnv>();

// (#27) page/limit went straight from parseInt into skip/take: 'abc' became
// NaN and 999999999 an unbounded read, so one request could pull (or crash
// on) the whole table. Same clamp the admin router uses.
function clampLimit(value: string | undefined, max = 100): number {
  const parsed = parseInt(value || '20');
  if (isNaN(parsed) || parsed < 1) return 20;
  return Math.min(parsed, max);
}

function clampPage(value: string | undefined): number {
  const parsed = parseInt(value || '1');
  if (isNaN(parsed) || parsed < 1) return 1;
  return parsed;
}

// (#3) Display-only projection of the User a ticket belongs to. The raw row
// carries passwordHash and the twoFactor* material, so nested `user`
// includes must never be `true`; phone is omitted because no admin screen
// renders it (grep of apps/ shows no caller of this endpoint at all).
const displayUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatar: true,
  role: true,
  isActive: true,
} as const;

// ============================================
// Create Ticket
// ============================================
// (#16) Ticket filing was unmetered: a single session could mint tens of
// thousands of tickets (each carrying attachments) in a loop. Capped at 10
// per user per hour — the bucket keys on the authenticated user id, so one
// abuser can't starve anyone else, and 10/hour is far above a real support
// conversation.
support.post('/tickets', rateLimit('support.createTicket'), validate(supportTicketSchema), async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const body = c.get('validatedData');
  const ticket = await prisma.supportTicket.create({
    data: { ...body, userId: user.id },
    include: { messages: true },
  });

  return c.json(ticket, 201);
});

// ============================================
// List Tickets
// ============================================
support.get('/tickets', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const page = clampPage(c.req.query('page'));
  const limit = clampLimit(c.req.query('limit'));
  const status = c.req.query('status');

  const where: any = { userId: user.id };
  if (status) where.status = status;

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.supportTicket.count({ where }),
  ]);

  return c.json({ tickets, total, page, limit });
});

// ============================================
// Get Ticket
// ============================================
support.get('/tickets/:id', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id');
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });

  if (!ticket || ticket.userId !== user.id) {
    return c.json({ error: 'Ticket not found' }, 404);
  }

  return c.json(ticket);
});

// ============================================
// Add Message to Ticket
// ============================================
support.post('/tickets/:id/messages', validate(supportMessageSchema), async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id')!;
  const ticket = await prisma.supportTicket.findUnique({ where: { id } });

  if (!ticket || ticket.userId !== user.id) {
    return c.json({ error: 'Ticket not found' }, 404);
  }

  const body = c.get('validatedData');
  const message = await prisma.supportMessage.create({
    data: {
      ticketId: id,
      senderId: user.id,
      content: body.content,
      isInternal: false,
      attachments: body.attachments || [],
    },
  });

  // Update ticket status
  await prisma.supportTicket.update({
    where: { id },
    data: { status: 'WAITING', updatedAt: new Date() },
  });

  return c.json(message, 201);
});

// ============================================
// Admin: List all tickets
// ============================================
support.get('/admin/tickets', roleGuard('ADMIN'), requireAdmin, requirePermission('support.view'), async (c) => {
  const page = clampPage(c.req.query('page'));
  const limit = clampLimit(c.req.query('limit'));
  const status = c.req.query('status');
  const priority = c.req.query('priority');
  const category = c.req.query('category');

  const where: any = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (category) where.category = category;

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      // (#3) Never the raw User row: it carries passwordHash and the
      // twoFactor* secrets. The list only needs who filed the ticket.
      include: { user: { select: displayUserSelect } },
    }),
    prisma.supportTicket.count({ where }),
  ]);

  return c.json({ tickets, total, page, limit });
});

// ============================================
// Admin: Update ticket
// ============================================
support.patch('/admin/tickets/:id', roleGuard('ADMIN'), requireAdmin, requirePermission('support.edit'), validate(ticketUpdateSchema), async (c) => {
  const id = c.req.param('id');
  const body = c.get('validatedData');

  const ticket = await prisma.supportTicket.update({
    where: { id },
    data: body,
  });

  return c.json(ticket);
});

// ============================================
// Admin: Reply to ticket
// ============================================
// (#16) An admin reply is written to the ticket and reaches the requester,
// so it gets a gentle cap too: 30 per admin per minute is far above any
// human reply cadence but stops a runaway loop from spraying every open
// ticket. Placed after the admin/permission guards so only admins consume
// this bucket.
support.post('/admin/tickets/:id/messages', roleGuard('ADMIN'), requireAdmin, requirePermission('support.edit'), rateLimit('admin.write'), validate(supportMessageSchema), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const body = c.get('validatedData');

  const message = await prisma.supportMessage.create({
    data: {
      ticketId: id,
      senderId: user.id,
      content: body.content,
      isInternal: body.isInternal || false,
      attachments: body.attachments || [],
    },
  });

  // Update ticket
  await prisma.supportTicket.update({
    where: { id },
    data: { status: 'IN_PROGRESS', updatedAt: new Date() },
  });

  return c.json(message, 201);
});

export default support;
