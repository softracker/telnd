import { Hono } from 'hono';
import { prisma } from '@telnd/database';
import { validate } from '../middleware/validate';
import { subscriptionSchema, couponApplySchema, couponValidateSchema } from '@telnd/validation';

type PackagesEnv = {
  Variables: {
    user: any;
    userId: string;
    validatedData: any;
  };
};

const packages = new Hono<PackagesEnv>();

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
packages.post('/subscribe', validate(subscriptionSchema), async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const { packageId, autoRenew = true } = c.get('validatedData');

  const pkg = await prisma.package.findUnique({ where: { id: packageId } });
  if (!pkg) return c.json({ error: 'Package not found' }, 404);

  const now = new Date();
  const trialEndsAt = pkg.trialDays ? new Date(now.getTime() + pkg.trialDays * 24 * 60 * 60 * 1000) : null;
  const endDate = pkg.billingCycle === 'MONTHLY' ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) :
                  pkg.billingCycle === 'YEARLY' ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) : null;

  // Use transaction to prevent race condition (duplicate subscriptions)
  const subscription = await prisma.$transaction(async (tx) => {
    const existing = await tx.userSubscription.findFirst({
      where: { userId: user.id, status: { in: ['ACTIVE', 'TRIAL'] } },
    });

    if (existing) {
      throw new Error('ALREADY_SUBSCRIBED');
    }

    return tx.userSubscription.create({
      data: {
        userId: user.id,
        packageId,
        status: pkg.price.equals(0) ? 'ACTIVE' : trialEndsAt ? 'TRIAL' : 'ACTIVE',
        startDate: now,
        endDate,
        trialEndsAt,
        autoRenew,
      },
      include: { package: true },
    });
  }).catch((e: any) => {
    if (e?.message === 'ALREADY_SUBSCRIBED') return null;
    throw e;
  });

  if (!subscription) {
    return c.json({ error: 'Already subscribed to a package' }, 400);
  }

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

  // Use upsert to prevent race condition (duplicate wallet creation)
  const wallet = await prisma.wallet.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

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
packages.post('/coupons/validate', validate(couponValidateSchema), async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const { code, packageId } = c.get('validatedData');

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

packages.post('/coupons/apply', validate(couponApplySchema), async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const { code, packageId, amount } = c.get('validatedData');

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.isActive) {
    return c.json({ error: 'Invalid coupon code' }, 400);
  }

  // Use transaction to prevent race condition (coupon usage limit bypass)
  try {
    await prisma.$transaction(async (tx) => {
      const freshCoupon = await tx.coupon.findUnique({ where: { id: coupon.id } });
      if (!freshCoupon || !freshCoupon.isActive) {
        throw new Error('INVALID_COUPON');
      }

      if (freshCoupon.usageLimit && freshCoupon.usageCount >= freshCoupon.usageLimit) {
        throw new Error('USAGE_LIMIT');
      }

      // Record usage
      await tx.couponUsage.create({
        data: { couponId: coupon.id, userId: user.id, amount },
      });

      // Increment usage count atomically
      await tx.coupon.update({
        where: { id: coupon.id },
        data: { usageCount: { increment: 1 } },
      });
    });
  } catch (e: any) {
    if (e?.message === 'INVALID_COUPON') {
      return c.json({ error: 'Invalid coupon code' }, 400);
    }
    if (e?.message === 'USAGE_LIMIT') {
      return c.json({ error: 'Coupon usage limit reached' }, 400);
    }
    throw e;
  }

  return c.json({ success: true, discount: coupon.value });
});

export default packages;
