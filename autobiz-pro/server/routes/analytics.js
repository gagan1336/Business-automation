// server/routes/analytics.js — Dashboard Analytics
const express = require('express');
const router = express.Router();
const prisma = require('../services/db');
const firebaseAuth = require('../middleware/firebaseAuth');

async function getBusiness(firebaseUid) {
  return prisma.business.findUniqueOrThrow({ where: { firebaseUid } });
}

// GET /api/analytics — Last 30 days of daily analytics
router.get('/', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const { days = 30 } = req.query;
    const daysInt = Math.min(Math.max(parseInt(days) || 30, 1), 90);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysInt);
    const startStr = startDate.toISOString().split('T')[0];

    const analytics = await prisma.analyticsDaily.findMany({
      where: {
        businessId: business.id,
        date: { gte: startStr },
      },
      orderBy: { date: 'asc' },
    });

    // Calculate summary stats
    const totals = analytics.reduce(
      (acc, day) => ({
        revenue: acc.revenue + day.revenue,
        bookings: acc.bookings + day.bookingCount,
        walkins: acc.walkins + day.walkinCount,
      }),
      { revenue: 0, bookings: 0, walkins: 0 }
    );

    // Count total customers and unread messages for dashboard stats
    const [customerCount, unreadCount] = await Promise.all([
      prisma.customer.count({ where: { businessId: business.id } }),
      prisma.conversation.aggregate({
        where: { businessId: business.id },
        _sum: { unreadCount: true },
      }),
    ]);

    res.json({
      analytics,
      summary: {
        ...totals,
        totalCustomers: customerCount,
        unreadMessages: unreadCount._sum.unreadCount || 0,
        days: daysInt,
      },
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

    const [todayStats, yesterdayStats, todayBookingCount, unreadCount] = await Promise.all([
      prisma.analyticsDaily.findUnique({
        where: { businessId_date: { businessId: business.id, date: today } },
      }),
      prisma.analyticsDaily.findUnique({
        where: { businessId_date: { businessId: business.id, date: yesterday } },
      }),
      prisma.booking.count({
        where: { businessId: business.id, date: today },
      }),
      prisma.conversation.aggregate({
        where: { businessId: business.id },
        _sum: { unreadCount: true },
      }),
    ]);

    const revenue = todayStats?.revenue || 0;
    const yRevenue = yesterdayStats?.revenue || 0;
    const pendingBookings = await prisma.booking.count({
      where: { businessId: business.id, date: today, status: 'pending' },
    });

    res.json({
      todayBookings: todayBookingCount,
      revenue,
      pendingPayments: pendingBookings,
      unreadMessages: unreadCount._sum.unreadCount || 0,
      revenueTrend: yRevenue > 0 ? Math.round(((revenue - yRevenue) / yRevenue) * 100) : 0,
    });
  } catch (err) {
    console.error('[Analytics] Today error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
