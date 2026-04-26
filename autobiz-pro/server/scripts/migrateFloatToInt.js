// server/scripts/migrateFloatToInt.js
// This script migrates legacy float values (e.g. 25.50) to integer cents (e.g. 2550)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting data migration: Float to Integer Cents...');

  // 1. Migrate Bookings
  const bookings = await prisma.booking.findMany({ where: { amount: { gt: 0 }, amountCents: 0 } });
  console.log(`Found ${bookings.length} bookings to migrate.`);
  for (const b of bookings) {
    const cents = Math.round(b.amount * 100);
    await prisma.booking.update({ where: { id: b.id }, data: { amountCents: cents } });
  }

  // 2. Migrate Services
  const services = await prisma.service.findMany({ where: { price: { gt: 0 }, priceCents: 0 } });
  console.log(`Found ${services.length} services to migrate.`);
  for (const s of services) {
    const cents = Math.round(s.price * 100);
    await prisma.service.update({ where: { id: s.id }, data: { priceCents: cents } });
  }

  // 3. Migrate Customers
  const customers = await prisma.customer.findMany({ where: { totalSpent: { gt: 0 }, totalSpentCents: 0 } });
  console.log(`Found ${customers.length} customers to migrate.`);
  for (const c of customers) {
    const cents = Math.round(c.totalSpent * 100);
    await prisma.customer.update({ where: { id: c.id }, data: { totalSpentCents: cents } });
  }

  // 4. Migrate AnalyticsDaily
  const analytics = await prisma.analyticsDaily.findMany({ where: { revenue: { gt: 0 }, revenueCents: 0 } });
  console.log(`Found ${analytics.length} analytics records to migrate.`);
  for (const a of analytics) {
    const cents = Math.round(a.revenue * 100);
    await prisma.analyticsDaily.update({ where: { id: a.id }, data: { revenueCents: cents } });
  }

  // 5. Migrate Walkins
  const walkins = await prisma.walkin.findMany({ where: { amount: { gt: 0 }, amountCents: 0 } });
  console.log(`Found ${walkins.length} walkins to migrate.`);
  for (const w of walkins) {
    const cents = Math.round(w.amount * 100);
    await prisma.walkin.update({ where: { id: w.id }, data: { amountCents: cents } });
  }

  console.log('✅ Migration completed successfully!');
}

main()
  .catch(e => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
