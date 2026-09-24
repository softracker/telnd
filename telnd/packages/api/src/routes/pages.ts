import { Hono } from 'hono';
import { prisma } from '@telnd/database';
import { contentPageSchema } from '@telnd/validation';
import { requireAdmin, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validate';

type PagesEnv = {
  Variables: {
    user: any;
    admin: any;
    validatedData: any;
  };
};

const pages = new Hono<PagesEnv>();

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Public: list published pages (used by the website footer / sitemap).
pages.get('/', async (c) => {
  const list = await prisma.contentPage.findMany({
    where: { isPublished: true },
    orderBy: { title: 'asc' },
    select: { slug: true, title: true },
  });
  return c.json({ success: true, data: list });
});

// Admin: list all pages including drafts.
// NOTE: registered before '/:slug' so 'admin' is never treated as a slug.
pages.get('/admin', requireAdmin, requirePermission('content.view'), async (c) => {
  const list = await prisma.contentPage.findMany({ orderBy: { updatedAt: 'desc' } });
  return c.json({ success: true, data: list });
});

pages.post('/admin', requireAdmin, requirePermission('content.create'), validate(contentPageSchema), async (c) => {
  const body = c.get('validatedData');

  const existing = await prisma.contentPage.findUnique({ where: { slug: body.slug } });
  if (existing) {
    return c.json({ success: false, error: { code: 'CONFLICT', message: 'A page with this slug already exists' } }, 409);
  }

  const page = await prisma.contentPage.create({ data: body });
  return c.json({ success: true, data: page }, 201);
});

pages.put('/admin/:id', requireAdmin, requirePermission('content.edit'), validate(contentPageSchema), async (c) => {
  const id = c.req.param('id');
  const body = c.get('validatedData');

  const page = await prisma.contentPage.findUnique({ where: { id } });
  if (!page) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Page not found' } }, 404);
  }
  if (body.slug !== page.slug) {
    const duplicate = await prisma.contentPage.findUnique({ where: { slug: body.slug } });
    if (duplicate) {
      return c.json({ success: false, error: { code: 'CONFLICT', message: 'A page with this slug already exists' } }, 409);
    }
  }

  const updated = await prisma.contentPage.update({ where: { id }, data: body });
  return c.json({ success: true, data: updated });
});

pages.delete('/admin/:id', requireAdmin, requirePermission('content.delete'), async (c) => {
  const id = c.req.param('id');

  const page = await prisma.contentPage.findUnique({ where: { id } });
  if (!page) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Page not found' } }, 404);
  }

  await prisma.contentPage.delete({ where: { id } });
  return c.json({ success: true });
});

// Public: single published page by slug. Registered last so it never shadows
// the '/admin' routes above.
pages.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  if (!SLUG_RE.test(slug)) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Page not found' } }, 404);
  }

  const page = await prisma.contentPage.findUnique({ where: { slug } });
  if (!page || !page.isPublished) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Page not found' } }, 404);
  }

  return c.json({
    success: true,
    data: { slug: page.slug, title: page.title, content: page.content, updatedAt: page.updatedAt },
  });
});

export default pages;
