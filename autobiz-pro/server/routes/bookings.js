// server/routes/bookings.js — Full CRUD for Bookings
const express = require('express');
const router = express.Router();
const prisma = require('../services/db');
const firebaseAuth = require('../middleware/firebaseAuth');
const { scheduleBookingReminder } = require('../queues/automationQueue');
const { sendBookingConfirmation } = require('../services/whatsapp');

// Helper: get business by firebase UID
async function getBusiness(firebaseUid) {
  return prisma.business.findUniqueOrThrow({ where: { firebaseUid } });
}

// GET /api/bookings — List bookings (filterable by date, status)
router.get('/', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const { date, status, page = 1, limit = 50 } = req.query;
    const where = { businessId: business.id };
    if (date) where.date = date;
    if (status) where.status = status;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: { customer: true, service: true },
        orderBy: [{ date: 'desc' }, { time: 'asc' }],
        skip: (page - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.booking.count({ where }),
    ]);

    res.json({ bookings, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bookings — Create booking
router.post('/', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const { customerName, phone, serviceId, date, time, amount, notes } = req.body;

    if (!customerName || !date || !time || !amount) {
      return res.status(400).json({ error: 'customerName, date, time, amount are required' });
    }

    // Upsert customer
    const avatarColors = ['#6366f1','#10b981','#f59e0b','#a855f7','#ef4444','#06b6d4','#ec4899'];
    const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    let customer = null;
    if (phone) {
      customer = await prisma.customer.upsert({
        where: { businessId_phone: { businessId: business.id, phone } },
        update: { name: customerName },
        create: {
          businessId: business.id, name: customerName, phone,
          avatarColor: randomColor,
        },
      });
    }

    // Get service name for messages
    const service = serviceId ? await prisma.service.findUnique({ where: { id: serviceId } }) : null;

    const booking = await prisma.booking.create({
      data: {
        businessId: business.id,
        customerId: customer?.id || null,
        serviceId: serviceId || null,
        date, time,
        amount: Number(amount),
        notes: notes || null,
        status: 'confirmed',
      },
      include: { customer: true, service: true },
    });

    // Send WhatsApp confirmation
    if (customer?.phone) {
      sendBookingConfirmation(
        customer.phone, customer.name,
        service?.name || 'appointment',
        date, time, business.slug
      ).catch(console.error);

      // Schedule reminder 2h before
      scheduleBookingReminder(booking, customer, business).catch(console.error);
    }

    // Update analytics
    await prisma.analyticsDaily.upsert({
      where: { businessId_date: { businessId: business.id, date } },
      update: { revenue: { increment: Number(amount) }, bookingCount: { increment: 1 } },
      create: { businessId: business.id, date, revenue: Number(amount), bookingCount: 1 },
    });

    res.status(201).json({ booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/bookings/:id — Update booking status or details
router.patch('/:id', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const existing = await prisma.booking.findFirst({ where: { id: req.params.id, businessId: business.id } });
    if (!existing) return res.status(404).json({ error: 'Booking not found' });

    const { status, date, time, amount, notes, serviceId } = req.body;
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status, date, time, amount: amount ? Number(amount) : undefined, notes, serviceId },
      include: { customer: true, service: true },
    });

    // Update customer stats if completed
    if (status === 'completed' && booking.customerId) {
      await prisma.customer.update({
        where: { id: booking.customerId },
        data: {
          totalSpent: { increment: booking.amount },
          totalVisits: { increment: 1 },
          lastVisit: new Date(),
        },
      });
    }

    res.json({ booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/bookings/:id
router.delete('/:id', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const existing = await prisma.booking.findFirst({ where: { id: req.params.id, businessId: business.id } });
    if (!existing) return res.status(404).json({ error: 'Booking not found' });
    await prisma.booking.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
