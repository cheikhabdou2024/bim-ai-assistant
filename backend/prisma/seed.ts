/**
 * Prisma Seed — BIM AI Assistant
 * Données de développement / test
 *
 * Run: npx prisma db seed
 *      (ou via: make seed)
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 10;

async function main() {
  console.log('🌱 Seeding database...');

  // ── Admin ────────────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin123!', BCRYPT_ROUNDS);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@bim-ai.com' },
    update: {},
    create: {
      name: 'Admin BIM AI',
      email: 'admin@bim-ai.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  });
  console.log(`  ✅ Admin: ${admin.email}`);

  // ── Test users ───────────────────────────────────────────────────────────
  const user1Password = await bcrypt.hash('User123!', BCRYPT_ROUNDS);
  const user1 = await prisma.user.upsert({
    where: { email: 'user1@test.com' },
    update: {},
    create: {
      name: 'Aliou Diallo',
      email: 'user1@test.com',
      password: user1Password,
      role: 'USER',
    },
  });
  console.log(`  ✅ User 1: ${user1.email}`);

  const user2Password = await bcrypt.hash('User123!', BCRYPT_ROUNDS);
  const user2 = await prisma.user.upsert({
    where: { email: 'user2@test.com' },
    update: {},
    create: {
      name: 'Fatou Ndiaye',
      email: 'user2@test.com',
      password: user2Password,
      role: 'USER',
    },
  });
  console.log(`  ✅ User 2: ${user2.email}`);

  // ── Rate limit test user ─────────────────────────────────────────────────
  // Utilisé par E2E TC-E2E-010/011 (rate limiting tests)
  const rlPassword = await bcrypt.hash('RateLimit1!', BCRYPT_ROUNDS);
  await prisma.user.upsert({
    where: { email: 'ratelimit@test.com' },
    update: {},
    create: {
      name: 'Rate Limit Tester',
      email: 'ratelimit@test.com',
      password: rlPassword,
      role: 'USER',
    },
  });
  console.log(`  ✅ Rate limit user: ratelimit@test.com`);

  console.log('\n🌱 Seed complete.');
  console.log('   admin@bim-ai.com  / Admin123!');
  console.log('   user1@test.com    / User123!');
  console.log('   user2@test.com    / User123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
