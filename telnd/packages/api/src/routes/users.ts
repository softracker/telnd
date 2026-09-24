import { Hono } from 'hono';
import { prisma } from '@telnd/database';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateAccountSchema } from '@telnd/validation';

type UsersEnv = {
  Variables: {
    user: any;
    userId: string;
    validatedData: any;
  };
};

export const userRoutes = new Hono<UsersEnv>();

userRoutes.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      candidateProfile: true,
      companyOwner: true,
    },
  });

  if (!user) {
    return c.json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'User not found' },
    }, 404);
  }

  const { passwordHash, ...safeUser } = user;

  return c.json({ success: true, data: safeUser });
});

// Own-account management: change name / email (password changes are
// intentionally not handled here).
userRoutes.patch('/me', authMiddleware, validate(updateAccountSchema), async (c) => {
  const userId = c.get('userId') as string;
  const body = c.get('validatedData');

  if (body.email) {
    const existing = await prisma.user.findFirst({
      where: { email: body.email, NOT: { id: userId } },
    });
    if (existing) {
      return c.json({
        success: false,
        error: { code: 'CONFLICT', message: 'An account with this email already exists' },
      }, 409);
    }
  }

  const data: Record<string, unknown> = {};
  if (body.firstName !== undefined) data.firstName = body.firstName;
  if (body.lastName !== undefined) data.lastName = body.lastName;
  if (body.email !== undefined) data.email = body.email;

  const user = await prisma.user.update({ where: { id: userId }, data });
  const { passwordHash, ...safeUser } = user;

  return c.json({ success: true, data: safeUser });
});

userRoutes.get('/me/applications', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId },
    include: {
      applications: {
        include: { job: { include: { company: true } } },
        orderBy: { appliedAt: 'desc' },
      },
    },
  });

  return c.json({
    success: true,
    data: (profile as any)?.applications || [],
  });
});
