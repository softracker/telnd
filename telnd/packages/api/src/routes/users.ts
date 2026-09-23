import { Hono } from 'hono';
import { prisma } from '@telnd/database';
import { authMiddleware } from '../middleware/auth';

type UsersEnv = {
  Variables: {
    user: any;
    userId: string;
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
