import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@telnd.com';
const ADMIN_PASSWORD = 'admin12345';

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash },
    create: {
      email: ADMIN_EMAIL,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isEmailVerified: true,
      passwordHash,
    },
  });

  console.log(`Admin user: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);

  const company = await prisma.company.upsert({
    where: { slug: 'telnd-demo' },
    update: {},
    create: {
      ownerId: admin.id,
      name: 'TELND Demo Company',
      slug: 'telnd-demo',
      description: 'A demo company for testing',
      industry: 'Technology',
      location: 'Dhaka, Bangladesh',
    },
  });

  console.log('Created demo company:', company.id);
  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
