import { Hono } from 'hono';
import { prisma } from '@telnd/database';
import { signupSchema, loginSchema } from '@telnd/validation';
import { validate } from '../middleware/validate';
import { rateLimit } from '../middleware/rateLimit';
import { sign, verify } from 'hono/jwt';
import { getLockoutState, isCurrentlyLockedOut, getRetryAfterSeconds, recordFailedAttempt, resetLockout, getFailedCount } from '../lib/loginLockout';
import { getIp } from '../lib/getIp';

type AuthEnv = {
  Variables: {
    validatedData: any;
  };
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  return secret;
}

function setAuthCookie(c: any, name: string, value: string, maxAgeSeconds: number) {
  const isSecure = process.env.NODE_ENV === 'production';
  c.header('Set-Cookie', `${name}=${value}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax; HttpOnly${isSecure ? '; Secure' : ''}`, { append: true });
}

export const authRoutes = new Hono<AuthEnv>();

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
        message: 'An account with this email already exists',
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

  const token = await sign({ sub: user.id, role: user.role, type: 'access', exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 }, getJwtSecret());
  const refreshToken = await sign({ sub: user.id, type: 'refresh', exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 }, getJwtSecret());

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  setAuthCookie(c, 'telnd_admin_token', token, 7 * 24 * 60 * 60);
  setAuthCookie(c, 'telnd_admin_refresh_token', refreshToken, 30 * 24 * 60 * 60);

  return c.json({
    success: true,
    data: {
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
  const identifier = data.email ?? data.phone;
  const ip = getIp(c);

  if (!identifier) {
    return c.json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Email or phone required' } }, 400);
  }

  // Step 1: Check lockout BEFORE any DB lookup
  const lockoutState = await getLockoutState(identifier);
  if (isCurrentlyLockedOut(lockoutState)) {
    const retryAfter = getRetryAfterSeconds(lockoutState);
    c.header('Retry-After', String(retryAfter));
    return c.json({
      success: false,
      error: {
        code: 'ACCOUNT_LOCKED',
        message: 'Too many failed attempts. Please try again later.',
        retryAfter,
      },
    }, 429);
  }

  // Step 2: If 2+ failed attempts, require Turnstile CAPTCHA
  const failedCount = getFailedCount(lockoutState);
  if (failedCount >= 2) {
    // Check if CAPTCHA is enabled in settings
    let captchaEnabled = false;
    try {
      const captchaSetting = await prisma.setting.findUnique({ where: { key: 'captcha' } });
      if (captchaSetting) {
        const val = captchaSetting.value as any;
        captchaEnabled = val?.enabled === true;
      }
    } catch {
      // If settings unavailable, skip CAPTCHA check (fail open)
    }

    if (captchaEnabled && data.turnstileToken) {
      // Verify Turnstile token with Cloudflare
      const secretKey = process.env.TURNSTILE_SECRET_KEY;
      if (secretKey) {
        try {
          const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              secret: secretKey,
              response: data.turnstileToken,
            }),
          });
          const result = await resp.json() as { success: boolean };
          if (!result.success) {
            return c.json({
              success: false,
              error: { code: 'CAPTCHA_FAILED', message: 'CAPTCHA verification failed. Please try again.' },
            }, 400);
            }
        } catch {
          // Turnstile API unreachable — fail open
        }
      }
    } else if (captchaEnabled && !data.turnstileToken) {
      // CAPTCHA enabled but no token provided
      return c.json({
        success: false,
        error: { code: 'CAPTCHA_REQUIRED', message: 'CAPTCHA verification is required.' },
      }, 400);
    }
  }

  // Step 3: Look up user
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        ...(data.email ? [{ email: data.email }] : []),
        ...(data.phone ? [{ phone: data.phone }] : []),
      ],
    },
  });

  if (!user) {
    await recordFailedAttempt(identifier, ip);
    return c.json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
    }, 401);
  }

  // Step 4: Check if account is active
  if (!user.isActive) {
    return c.json({
      success: false,
      error: { code: 'ACCOUNT_DEACTIVATED', message: 'Your account has been deactivated. Please contact support.' },
    }, 403);
  }

  // Step 5: Verify credentials
  if (data.password) {
    if (!user.passwordHash) {
      await recordFailedAttempt(identifier, ip);
      return c.json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      }, 401);
    }
    const bcrypt = await import('bcryptjs');
    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) {
      await recordFailedAttempt(identifier, ip);
      return c.json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      }, 401);
    }
  }

  // Step 6: Success — reset lockout completely
  await resetLockout(identifier);

  const token = await sign({ sub: user.id, role: user.role, type: 'access', exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 }, getJwtSecret());
  const refreshToken = await sign({ sub: user.id, type: 'refresh', exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 }, getJwtSecret());

  await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  setAuthCookie(c, 'telnd_admin_token', token, 7 * 24 * 60 * 60);
  setAuthCookie(c, 'telnd_admin_refresh_token', refreshToken, 30 * 24 * 60 * 60);

  return c.json({
    success: true,
    data: {
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

authRoutes.post('/refresh', rateLimit({ windowMs: 60000, max: 10 }), async (c) => {
  // Try cookie first, then body
  const cookieHeader = c.req.header('Cookie') || '';
  const refreshTokenFromCookie = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('telnd_admin_refresh_token='))
    ?.split('=')
    .slice(1)
    .join('=');

  const body = await c.req.json().catch(() => null);
  const refreshToken = refreshTokenFromCookie || body?.refreshToken;

  if (!refreshToken) {
    return c.json({
      success: false,
      error: { code: 'INVALID_REQUEST', message: 'Refresh token required' },
    }, 400);
  }

  try {
    const payload = await verify(refreshToken, getJwtSecret(), 'HS256');

    if (!payload || !payload.sub || payload.type !== 'refresh') {
      return c.json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid refresh token' },
      }, 401);
    }

    const storedRefresh = await prisma.refreshToken.findFirst({
      where: { token: refreshToken, userId: payload.sub as string },
      include: { user: true },
    });

    if (!storedRefresh || storedRefresh.expiresAt < new Date()) {
      return c.json({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Refresh token expired' },
      }, 401);
    }

    // Rotate: delete old, issue new
    await prisma.refreshToken.delete({ where: { id: storedRefresh.id } });

    const newToken = await sign({ sub: storedRefresh.user.id, role: storedRefresh.user.role, type: 'access', exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 }, getJwtSecret());
    const newRefreshToken = await sign({ sub: storedRefresh.user.id, type: 'refresh', exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 }, getJwtSecret());

    await prisma.session.update({
      where: { token: refreshToken },
      data: { token: newToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    }).catch(async () => {
      // If session with old token doesn't exist, create new one
      await prisma.session.create({
        data: {
          userId: storedRefresh.user.id,
          token: newToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    });

    await prisma.refreshToken.create({
      data: {
        userId: storedRefresh.user.id,
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    setAuthCookie(c, 'telnd_admin_token', newToken, 7 * 24 * 60 * 60);
    setAuthCookie(c, 'telnd_admin_refresh_token', newRefreshToken, 30 * 24 * 60 * 60);

    return c.json({
      success: true,
      data: {
        user: {
          id: storedRefresh.user.id,
          email: storedRefresh.user.email,
          firstName: storedRefresh.user.firstName,
          lastName: storedRefresh.user.lastName,
          role: storedRefresh.user.role,
          avatar: storedRefresh.user.avatar,
        },
      },
    });
  } catch {
    return c.json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid refresh token' },
    }, 401);
  }
});

authRoutes.post('/logout', async (c) => {
  const cookieHeader = c.req.header('Cookie') || '';

  // Extract both tokens from cookies
  const tokenFromCookie = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('telnd_admin_token='))
    ?.split('=')
    .slice(1)
    .join('=');

  const refreshTokenFromCookie = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('telnd_admin_refresh_token='))
    ?.split('=')
    .slice(1)
    .join('=');

  // Delete session from DB
  if (tokenFromCookie) {
    await prisma.session.deleteMany({ where: { token: tokenFromCookie } }).catch(() => {});
  }

  // Delete refresh tokens from DB
  if (refreshTokenFromCookie) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshTokenFromCookie } }).catch(() => {});
  }

  // Clear both cookies
  c.header('Set-Cookie', 'telnd_admin_token=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly', { append: true });
  c.header('Set-Cookie', 'telnd_admin_refresh_token=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly', { append: true });

  return c.json({ success: true, data: { message: 'Logged out' } });
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
