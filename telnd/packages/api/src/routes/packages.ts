import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const packages = new Hono();

// ============================================
// Public Package Listing
// ============================================
packages.get('/', async (c) => {
  const { type } = c.req.query();
  const where: any = { isActive: true };
  if (type) where.type = type;

  const result = await prisma.package.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
  });

  return c.json(result);
});

packages.get('/:id', async (c) => {
  const id = c.req.param('id');
  const pkg = await prisma.package.findUnique({ where: { id } });
  if (!pkg) return c.json({ error: 'Package not found' }, 404);
  return c.json(pkg);
});

// ============================================
// Subscriptions
// ============================================
packages.post('/subscribe', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const { packageId, autoRenew = true } = await c.req.json();

  const pkg = await prisma.package.findUnique({ where: { id: packageId } });
  if (!pkg) return c.json({ error: 'Package not found' }, 404);

  // Check existing subscription
  const existing = await prisma.userSubscription.findFirst({
    where: { userId: user.id, status: { in: ['ACTIVE', 'TRIAL'] } },
  });

  if (existing) {
    return c.json({ error: 'Already subscribed to a package' }, 400);
  }

  const now = new Date();
  const trialEndsAt = pkg.trialDays ? new Date(now.getTime() + pkg.trialDays * 24 * 60 * 60 * 1000) : null;
  const endDate = pkg.billingCycle === 'MONTHLY' ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) :
                  pkg.billingCycle === 'YEARLY' ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) : null;

  const subscription = await prisma.userSubscription.create({
    data: {
      userId: user.id,
      packageId,
      status: pkg.price === 0 ? 'ACTIVE' : trialEndsAt ? 'TRIAL' : 'ACTIVE',
      startDate: now,
      endDate,
      trialEndsAt,
      autoRenew,
    },
    include: { package: true },
  });

  return c.json(subscription, 201);
});

packages.get('/subscriptions/mine', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const subscriptions = await prisma.userSubscription.findMany({
    where: { userId: user.id },
    include: { package: true },
    orderBy: { createdAt: 'desc' },
  });

  return c.json(subscriptions);
});

packages.patch('/subscriptions/:id/cancel', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id');
  const subscription = await prisma.userSubscription.findUnique({ where: { id } });

  if (!subscription || subscription.userId !== user.id) {
    return c.json({ error: 'Subscription not found' }, 404);
  }

  const updated = await prisma.userSubscription.update({
    where: { id },
    data: { status: 'CANCELLED', cancelAt: new Date() },
  });

  return c.json(updated);
});

// ============================================
// Invoices
// ============================================
packages.get('/invoices/mine', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const invoices = await prisma.invoice.findMany({
    where: { userId: user.id },
    include: { package: true, payment: true },
    orderBy: { createdAt: 'desc' },
  });

  return c.json(invoices);
});

// ============================================
// Wallet
// ============================================
packages.get('/wallet', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  let wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
  if (!wallet) {
    wallet = await prisma.wallet.create({ data: { userId: user.id } });
  }

  return c.json(wallet);
});

packages.get('/wallet/transactions', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
  if (!wallet) return c.json({ transactions: [] });

  const transactions = await prisma.walletTransaction.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return c.json(transactions);
});

// ============================================
// Coupons
// ============================================
packages.post('/coupons/validate', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const { code, packageId } = await c.req.json();

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.isActive) {
    return c.json({ error: 'Invalid coupon code' }, 400);
  }

  if (new Date() < coupon.validFrom || new Date() > coupon.validUntil) {
    return c.json({ error: 'Coupon has expired' }, 400);
  }

  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    return c.json({ error: 'Coupon usage limit reached' }, 400);
  }

  // Check per-user limit
  const userUsage = await prisma.couponUsage.count({
    where: { couponId: coupon.id, userId: user.id },
  });
  if (coupon.perUserLimit && userUsage >= coupon.perUserLimit) {
    return c.json({ error: 'You have already used this coupon' }, 400);
  }

  return c.json({
    valid: true,
    type: coupon.type,
    value: coupon.value,
    maxDiscount: coupon.maxDiscount,
    minPurchase: coupon.minPurchase,
  });
});

packages.post('/coupons/apply', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const { code, packageId, amount } = await c.req.json();

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.isActive) {
    return c.json({ error: 'Invalid coupon code' }, 400);
  }

  // Record usage
  await prisma.couponUsage.create({
    data: { couponId: coupon.id, userId: user.id, amount },
  });

  // Increment usage count
  await prisma.coupon.update({
    where: { id: coupon.id },
    data: { usageCount: { increment: 1 } },
  });

  return c.json({ success: true, discount: coupon.value });
});

export default packages;
