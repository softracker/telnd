import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create a demo admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@telnd.com' },
    update: {},
    create: {
      email: 'admin@telnd.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isEmailVerified: true,
    },
  });

  console.log('Created admin user:', admin.id);

  // Create a demo company
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
