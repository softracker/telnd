import { Hono } from 'hono';
import { prisma } from '@telnd/database';
import { signupSchema, loginSchema } from '@telnd/validation';
import { validate } from '../middleware/validate';
import { rateLimit } from '../middleware/rateLimit';

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

  const user = await prisma.user.create({
    data: {
      email: data.email,
      phone: data.phone,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
    },
  });

  return c.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
  }, 201);
});

authRoutes.post('/login', rateLimit({ windowMs: 60000, max: 10 }), validate(loginSchema), async (c) => {
  const data = c.get('validatedData');

  // Placeholder - implement proper auth in production
  return c.json({
    success: true,
    data: {
      message: 'Login endpoint ready',
    },
  });
});

authRoutes.post('/otp/request', rateLimit({ windowMs: 60000, max: 3 }), async (c) => {
  // Placeholder for OTP request
  return c.json({
    success: true,
    data: { message: 'OTP sent' },
  });
});

authRoutes.post('/otp/verify', rateLimit({ windowMs: 60000, max: 5 }), async (c) => {
  // Placeholder for OTP verification
  return c.json({
    success: true,
    data: { message: 'OTP verified' },
  });
});
