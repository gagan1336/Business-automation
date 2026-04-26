// server/routes/walkins.js — Walk-in Entry (upgraded for int cents schema)
const express = require('express');
const router = express.Router();
const prisma = require('../services/db');
const firebaseAuth = require('../middleware/firebaseAuth');
const { scheduleTask } = require('../services/scheduler');
const { sendTextMessage } = require('../services/whatsapp');
const llm = require('../services/llm');

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
    // Return amount in dollars for frontend compatibility
    const formatted = walkins.map(w => ({
      ...w,
      amount: w.amountCents / 100,
    }));
    res.json({ walkins: formatted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/walkins — Add walk-in
router.post('/', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const { customerName, phone, service, amount } = req.body;
    if (!customerName || !service) {
      return res.status(400).json({ error: 'customerName and service are required' });
    }

    const amountCents = Math.round(Number(amount || 0) * 100);

    const walkin = await prisma.walkin.create({
      data: {
        businessId: business.id,
        customerName, phone: phone || '',
        service,
        amountCents,
      },
    });

    // Update daily analytics
    const today = new Date().toISOString().split('T')[0];
    await prisma.analyticsDaily.upsert({
      where: { businessId_date: { businessId: business.id, date: today } },
      update: { revenueCents: { increment: amountCents }, walkinCount: { increment: 1 } },
      create: { businessId: business.id, date: today, revenueCents: amountCents, walkinCount: 1 },
    });

    // Send thank-you via WhatsApp (LLM-generated, non-blocking)
    if (phone) {
      (async () => {
        try {
          const msg = await llm.generateMessage('review_request', {
            customerName,
            service,
            businessName: business.name,
          });
          await sendTextMessage(phone.replace(/\D/g, ''), msg);
        } catch (err) {
          console.error('[Walkin] Thank-you send error:', err.message);
        }
      })();
    }

    // Upsert customer record
    if (phone) {
      const colors = ['#6366f1','#10b981','#f59e0b','#a855f7','#ef4444','#06b6d4','#ec4899'];
      await prisma.customer.upsert({
        where: { businessId_phone: { businessId: business.id, phone } },
        update: { totalSpentCents: { increment: amountCents }, totalVisits: { increment: 1 }, lastVisit: new Date() },
        create: {
          businessId: business.id, name: customerName, phone,
          avatarColor: colors[Math.floor(Math.random() * colors.length)],
          totalSpentCents: amountCents, totalVisits: 1, lastVisit: new Date(),
        },
      });
    }

    res.status(201).json({ walkin: { ...walkin, amount: amountCents / 100 } });
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
