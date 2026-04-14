// server/routes/walkins.js
const express = require('express');
const router = express.Router();
const prisma = require('../services/db');
const firebaseAuth = require('../middleware/firebaseAuth');
const { scheduleWalkinThanks } = require('../queues/automationQueue');

async function getBusiness(firebaseUid) {
  return prisma.business.findUniqueOrThrow({ where: { firebaseUid } });
}

// GET /api/walkins?date=
router.get('/', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const { date } = req.query;
    const where = { businessId: business.id };
    if (date) {
      const start = new Date(date + 'T00:00:00.000Z');
      const end = new Date(date + 'T23:59:59.999Z');
      where.createdAt = { gte: start, lte: end };
    }
    const walkins = await prisma.walkin.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ walkins });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/walkins — Add walk-in
router.post('/', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const { customerName, phone, service, amount } = req.body;
    if (!customerName || !service || !amount) {
      return res.status(400).json({ error: 'customerName, service, amount are required' });
    }

    const walkin = await prisma.walkin.create({
      data: {
        businessId: business.id,
        customerName, phone: phone || '',
        service,
        amount: Number(amount),
      },
    });

    // Update daily analytics
    const today = new Date().toISOString().split('T')[0];
    await prisma.analyticsDaily.upsert({
      where: { businessId_date: { businessId: business.id, date: today } },
      update: { revenue: { increment: Number(amount) }, walkinCount: { increment: 1 } },
      create: { businessId: business.id, date: today, revenue: Number(amount), walkinCount: 1 },
    });

    // Schedule thank-you WhatsApp (non-blocking)
    if (phone) {
      scheduleWalkinThanks({ ...walkin, customerName, phone }).catch(console.error);
    }

    // Upsert customer record
    if (phone) {
      const colors = ['#6366f1','#10b981','#f59e0b','#a855f7','#ef4444','#06b6d4','#ec4899'];
      await prisma.customer.upsert({
        where: { businessId_phone: { businessId: business.id, phone } },
        update: { totalSpent: { increment: Number(amount) }, totalVisits: { increment: 1 }, lastVisit: new Date() },
        create: {
          businessId: business.id, name: customerName, phone,
          avatarColor: colors[Math.floor(Math.random() * colors.length)],
          totalSpent: Number(amount), totalVisits: 1, lastVisit: new Date(),
        },
      });
    }

    res.status(201).json({ walkin });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/walkins/:id
router.delete('/:id', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    await prisma.walkin.deleteMany({ where: { id: req.params.id, businessId: business.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
