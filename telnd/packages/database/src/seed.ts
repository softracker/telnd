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

  // Admin system: super-admin role (all permissions) + link the admin user to
  // it, so /api/admin/* (requireAdmin) and permission checks work out of the box.
  const superRole = await prisma.adminRole.upsert({
    where: { name: 'Super Admin' },
    update: {},
    create: {
      name: 'Super Admin',
      description: 'Full access to everything',
      permissions: ['*'],
      isSystem: true,
    },
  });

  await prisma.adminUser.upsert({
    where: { userId: admin.id },
    update: { roleId: superRole.id, isActive: true },
    create: { userId: admin.id, roleId: superRole.id },
  });

  console.log(`Admin role: ${superRole.name}`);

  // Default website content pages (Admin -> Settings -> Website Content).
  const defaultPages = [
    {
      slug: 'about-us',
      title: 'About Us',
      content: '<p>We are TELND — a career and talent platform helping people prepare for careers, discover opportunities, prove their skills, and get hired.</p>',
    },
    {
      slug: 'privacy-policy',
      title: 'Privacy Policy',
      content: '<p>This Privacy Policy describes how TELND collects, uses, and protects your personal information when you use our platform.</p>',
    },
    {
      slug: 'terms-and-conditions',
      title: 'Terms & Conditions',
      content: '<p>These Terms & Conditions govern your use of the TELND platform. By using the platform you agree to these terms.</p>',
    },
  ];
  for (const page of defaultPages) {
    await prisma.contentPage.upsert({
      where: { slug: page.slug },
      update: {},
      create: { ...page, isPublished: true },
    });
  }

  console.log(`Seeded ${defaultPages.length} content pages`);

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
