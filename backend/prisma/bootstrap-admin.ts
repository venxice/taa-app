import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const username = process.env.BOOTSTRAP_ADMIN_USERNAME?.trim();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!username || !password || password.length < 16) {
    throw new Error('Set BOOTSTRAP_ADMIN_USERNAME and a BOOTSTRAP_ADMIN_PASSWORD of at least 16 characters.');
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) throw new Error(`An account named "${username}" already exists; refusing to change its password.`);

  await prisma.user.create({
    data: {
      firstName: 'TAA',
      lastName: 'Administrator',
      username,
      password: await bcrypt.hash(password, 12),
      role: 'admin',
      status: 'verified',
      verifiedAt: new Date(),
    },
  });
  console.log(`Created verified administrator account "${username}".`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
