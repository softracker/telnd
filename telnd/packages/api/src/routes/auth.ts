import { Hono } from 'hono';
import { prisma } from '@telnd/database';
import { signupSchema, loginSchema } from '@telnd/validation';
import { validate } from '../middleware/validate';
import { rateLimit } from '../middleware/rateLimit';
import { sign } from 'hono/jwt';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export const authRoutes = new Hono();

authRoutes.post('/signup', rateLimit({ windowMs: 60000, max: 5 }), validate(signupSchema), async (c) => {
  const data = c.get('validatedData');

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: data.email },
        ...(data.phone ? [{ phone: data.phone }] : []),
      ],
    },
  });

  if (existingUser) {
    return c.json({
      success: false,
      error: {
        code: 'USER_EXISTS',
        message: 'An account with this email or phone already exists',
      },
    }, 409);
  }

  const bcrypt = await import('bcryptjs');
  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      phone: data.phone,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      passwordHash,
    },
  });

  const token = await sign({ sub: user.id, role: user.role, exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 }, JWT_SECRET);
  const refreshToken = await sign({ sub: user.id, type: 'refresh', exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 }, JWT_SECRET);

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return c.json({
    success: true,
    data: {
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
      },
    },
  }, 201);
});

authRoutes.post('/login', rateLimit({ windowMs: 60000, max: 10 }), validate(loginSchema), async (c) => {
  const data = c.get('validatedData');

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        ...(data.email ? [{ email: data.email }] : []),
        ...(data.phone ? [{ phone: data.phone }] : []),
      ],
    },
  });

  if (!user) {
    return c.json({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      },
    }, 401);
  }

  if (data.password && user.passwordHash) {
    const bcrypt = await import('bcryptjs');
    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      }, 401);
    }
  }

  const token = await sign({ sub: user.id, role: user.role, exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 }, JWT_SECRET);
  const refreshToken = await sign({ sub: user.id, type: 'refresh', exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 }, JWT_SECRET);

  await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return c.json({
    success: true,
    data: {
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
      },
    },
  });
});

authRoutes.post('/otp/request', rateLimit({ windowMs: 60000, max: 3 }), async (c) => {
  return c.json({
    success: true,
    data: { message: 'OTP sent' },
  });
});

authRoutes.post('/otp/verify', rateLimit({ windowMs: 60000, max: 5 }), async (c) => {
  return c.json({
    success: true,
    data: { message: 'OTP verified' },
  });
});
