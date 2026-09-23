import { Hono } from 'hono';
import { prisma } from '@telnd/database';
import { validate } from '../middleware/validate';
import { roleGuard } from '../middleware/auth';
import { supportTicketSchema, supportMessageSchema, ticketUpdateSchema } from '@telnd/validation';

type SupportEnv = {
  Variables: {
    user: any;
    userId: string;
    validatedData: any;
  };
};

const support = new Hono<SupportEnv>();

// ============================================
// Create Ticket
// ============================================
support.post('/tickets', validate(supportTicketSchema), async (c) => {
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

  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
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
support.get('/admin/tickets', roleGuard('ADMIN'), async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
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
      include: { user: true },
    }),
    prisma.supportTicket.count({ where }),
  ]);

  return c.json({ tickets, total, page, limit });
});

// ============================================
// Admin: Update ticket
// ============================================
support.patch('/admin/tickets/:id', roleGuard('ADMIN'), validate(ticketUpdateSchema), async (c) => {
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
support.post('/admin/tickets/:id/messages', roleGuard('ADMIN'), validate(supportMessageSchema), async (c) => {
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
