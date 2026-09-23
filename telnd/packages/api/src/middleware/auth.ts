import { Context, Next } from 'hono';
import { verify } from 'hono/jwt';
import { prisma } from '@telnd/database';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  return secret;
}

export async function authMiddleware(c: Context, next: Next) {
  // Try cookie first, then Authorization header
  const cookieHeader = c.req.header('Cookie') || '';
  const tokenFromCookie = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('telnd_admin_token='))
    ?.split('=')
    .slice(1)
    .join('=');

  const authHeader = c.req.header('Authorization');
  const tokenFromHeader = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  const token = tokenFromCookie || tokenFromHeader;

  if (!token) {
    return c.json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing authentication token',
      },
    }, 401);
  }

  try {
    // Verify JWT signature and expiration
    const payload = await verify(token, getJwtSecret(), 'HS256');

    if (!payload || !payload.sub) {
      return c.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid token payload',
        },
      }, 401);
    }

    // Verify session exists in database and is not expired
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return c.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Session expired or revoked',
        },
      }, 401);
    }

    // Check if user account is active
    if (!session.user.isActive) {
      return c.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Account has been deactivated',
        },
      }, 403);
    }

    c.set('user', session.user);
    c.set('userId', session.user.id);

    await next();
  } catch (error) {
    return c.json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      },
    }, 401);
  }
}

export function roleGuard(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    if (!user || !roles.includes(user.role)) {
      return c.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      }, 403);
    }
    await next();
  };
}
