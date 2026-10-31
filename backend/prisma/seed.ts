// ============================================================
// Seed - creates an admin and a sample resident
// Usage: npx tsx prisma/seed.ts
// ============================================================
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

if (process.env.NODE_ENV === 'production') {
  throw new Error('The demo seed is disabled in production. Use the secure admin bootstrap script instead.');
}

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('Admin123!', 10);
  const residentPassword = await bcrypt.hash('Resident123!', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    // Keep the documented local demo credentials valid when re-seeding.
    update: { password, status: 'verified' },
    create: {
      firstName: 'System',
      lastName: 'Administrator',
      username: 'admin',
      email: 'admin@teremil.local',
      password,
      role: 'admin',
      status: 'verified',
      verifiedAt: new Date(),
    },
  });

  const residentUser = await prisma.user.upsert({
    where: { username: 'resident' },
    update: { password: residentPassword, status: 'verified' },
    create: {
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      username: 'resident',
      email: 'resident@teremil.local',
      password: residentPassword,
      role: 'resident',
      status: 'verified',
      verifiedAt: new Date(),
      resident: {
        create: {
          email: 'resident@teremil.local',
          phone: '09171234567',
          street: 'Maharlika Street',
          barangay: 'Teremil',
          municipality: 'Santa Rosa',
        },
      },
    },
    include: { resident: true },
  });

  const officerUser = await prisma.user.upsert({
    where: { username: 'officer' },
    update: { password: residentPassword, status: 'verified' },
    create: {
      firstName: 'Maria',
      lastName: 'Santos',
      username: 'officer',
      email: 'officer@teremil.local',
      password: residentPassword,
      role: 'hoa_officer',
      status: 'verified',
      verifiedAt: new Date(),
    },
  });

  // Sample HOA officials (first run only)
  const officialCount = await prisma.official.count();
  if (officialCount === 0) {
    const officials = [
      { firstName: 'Rafael', lastName: 'Cruz', position: 'President', positionOrder: 1, contactNumber: '09170000001', email: 'president@teremil.local' },
      { firstName: 'Rosalinda', lastName: 'Mendoza', position: 'Vice President', positionOrder: 2, contactNumber: '09170000002', email: 'vicepresident@teremil.local' },
      { firstName: 'Fernando', lastName: 'Lim', position: 'Secretary', positionOrder: 3, contactNumber: '09170000003', email: 'secretary@teremil.local' },
      { firstName: 'Teresita', lastName: 'Garcia', position: 'Treasurer', positionOrder: 4, contactNumber: '09170000004', email: 'treasurer@teremil.local' },
      { firstName: 'Alfredo', lastName: 'Navarro', position: 'Auditor', positionOrder: 5, contactNumber: '09170000005', email: 'auditor@teremil.local' },
      { firstName: 'Lourdes', lastName: 'Reyes', position: 'Board Member', positionOrder: 6, contactNumber: '09170000006', email: 'board1@teremil.local' },
      { firstName: 'Roberto', lastName: 'Villanueva', position: 'Board Member', positionOrder: 7, contactNumber: '09170000007', email: 'board2@teremil.local' },
    ];
    for (const o of officials) {
      await prisma.official.create({
        data: {
          ...o,
          termFrom: new Date('2026-01-01'),
          termTo: new Date('2026-12-31'),
          isActive: true,
          createdById: admin.id,
        },
      });
    }
    console.log(`  officials / ${officials.length} sample HOA officers`);
  }

  console.log('Seeded:');
  console.log(`  admin    / ${admin.username}  (password: Admin123!)`);
  console.log(`  officer  / ${officerUser.username}  (password: Resident123!)`);
  console.log(`  resident / ${residentUser.username}  (password: Resident123!)`);

  if (!residentUser.resident) {
    console.log('  (resident profile created)');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
