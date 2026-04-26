// server/routes/analytics.js — Dashboard Analytics (upgraded)
const express = require('express');
const router = express.Router();
const prisma = require('../services/db');
const firebaseAuth = require('../middleware/firebaseAuth');

async function getBusiness(firebaseUid) {
  return prisma.business.findUniqueOrThrow({
    where: { firebaseUid },
    include: { settings: true },
  });
}

// GET /api/analytics — Last N days of daily analytics
router.get('/', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const { days = 30 } = req.query;
    const daysInt = Math.min(Math.max(parseInt(days) || 30, 1), 90);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysInt);
    const startStr = startDate.toISOString().split('T')[0];

    const analytics = await prisma.analyticsDaily.findMany({
      where: { businessId: business.id, date: { gte: startStr } },
      orderBy: { date: 'asc' },
    });

    // Calculate summary stats
    const totals = analytics.reduce(
      (acc, day) => ({
        revenueCents: acc.revenueCents + day.revenueCents,
        bookings: acc.bookings + day.bookingCount,
        walkins: acc.walkins + day.walkinCount,
        noShows: acc.noShows + day.noShowCount,
        cancels: acc.cancels + day.cancelCount,
        newCustomers: acc.newCustomers + day.newCustomers,
      }),
      { revenueCents: 0, bookings: 0, walkins: 0, noShows: 0, cancels: 0, newCustomers: 0 }
    );

    // Count total customers, repeat customers, unread messages
    const [customerCount, repeatCustomers, unreadCount, staffCount] = await Promise.all([
      prisma.customer.count({ where: { businessId: business.id, deletedAt: null } }),
      prisma.customer.count({ where: { businessId: business.id, deletedAt: null, totalVisits: { gte: 2 } } }),
      prisma.conversation.aggregate({
        where: { businessId: business.id },
        _sum: { unreadCount: true },
      }),
      prisma.staffMember.count({ where: { businessId: business.id, active: true } }),
    ]);

    const repeatRate = customerCount > 0 ? Math.round((repeatCustomers / customerCount) * 100) : 0;
    const noShowRate = totals.bookings > 0 ? Math.round((totals.noShows / totals.bookings) * 100) : 0;

    res.json({
      analytics: analytics.map(d => ({
        ...d,
        revenue: d.revenueCents / 100, // backward compat
      })),
      summary: {
        ...totals,
        revenue: totals.revenueCents / 100,
        totalCustomers: customerCount,
        repeatCustomers,
        repeatRate,
        noShowRate,
        unreadMessages: unreadCount._sum.unreadCount || 0,
        staffCount,
        days: daysInt,
      },
      currency: business.settings?.currencySymbol || '$',
    });
  } catch (err) {
    console.error('[Analytics] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/today — Quick today stats for dashboard
router.get('/today', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const dayStart = new Date(today + 'T00:00:00Z');
    const dayEnd = new Date(today + 'T23:59:59Z');

    const [todayStats, yesterdayStats, todayBookingCount, unreadCount, pendingBookings, totalCustomers, repeatCustomers, noShowCount] = await Promise.all([
      prisma.analyticsDaily.findUnique({
        where: { businessId_date: { businessId: business.id, date: today } },
      }),
      prisma.analyticsDaily.findUnique({
        where: { businessId_date: { businessId: business.id, date: yesterday } },
      }),
      prisma.booking.count({
        where: { businessId: business.id, startTime: { gte: dayStart, lte: dayEnd }, deletedAt: null },
      }),
      prisma.conversation.aggregate({
        where: { businessId: business.id },
        _sum: { unreadCount: true },
      }),
      prisma.booking.count({
        where: { businessId: business.id, startTime: { gte: dayStart, lte: dayEnd }, status: 'pending', deletedAt: null },
      }),
      prisma.customer.count({ where: { businessId: business.id, deletedAt: null } }),
      prisma.customer.count({ where: { businessId: business.id, deletedAt: null, totalVisits: { gte: 2 } } }),
      prisma.booking.count({
        where: { businessId: business.id, status: 'no_show', deletedAt: null },
      }),
    ]);

    const revenueCents = todayStats?.revenueCents || 0;
    const yRevenueCents = yesterdayStats?.revenueCents || 0;
    const totalBookingsEver = await prisma.booking.count({
      where: { businessId: business.id, deletedAt: null },
    });

    res.json({
      todayBookings: todayBookingCount,
      revenue: revenueCents / 100,
      revenueCents,
      pendingPayments: pendingBookings,
      unreadMessages: unreadCount._sum.unreadCount || 0,
      revenueTrend: yRevenueCents > 0 ? Math.round(((revenueCents - yRevenueCents) / yRevenueCents) * 100) : 0,
      repeatRate: totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0,
      noShowRate: totalBookingsEver > 0 ? Math.round((noShowCount / totalBookingsEver) * 100) : 0,
      totalCustomers,
      currency: business.settings?.currencySymbol || '$',
    });
  } catch (err) {
    console.error('[Analytics] Today error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/team — Team utilization stats
router.get('/team', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const { days = 7 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const staff = await prisma.staffMember.findMany({
      where: { businessId: business.id, active: true },
      select: {
        id: true, name: true, avatarColor: true,
        _count: {
          select: {
            bookings: {
              where: { startTime: { gte: startDate }, status: { not: 'cancelled' }, deletedAt: null },
            },
          },
        },
      },
    });

    // Calculate utilization (bookings / available hours)
    const teamStats = staff.map(s => ({
      id: s.id,
      name: s.name,
      avatarColor: s.avatarColor,
      bookings: s._count.bookings,
      // Rough utilization: bookings * 0.5h / (8h * days) * 100
      utilization: Math.min(100, Math.round((s._count.bookings * 30) / (480 * Number(days)) * 100)),
    }));

    res.json({ team: teamStats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
