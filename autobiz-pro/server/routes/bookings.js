// server/routes/bookings.js — Full CRUD for Bookings (upgraded)
const express = require('express');
const router = express.Router();
const prisma = require('../services/db');
const firebaseAuth = require('../middleware/firebaseAuth');
const { scheduleBookingReminders } = require('../services/scheduler');
const { generateBookingConfirmation } = require('../services/llm');
const { sendTextMessage } = require('../services/whatsapp');
const { sendEmail } = require('../services/mailer');
const { v4: uuidv4 } = require('uuid');

// Helper: get business by firebase UID
async function getBusiness(firebaseUid) {
  return prisma.business.findUniqueOrThrow({
    where: { firebaseUid },
    include: { settings: true },
  });
}

// Helper: check for double booking
async function checkDoubleBooking(staffMemberId, startTime, endTime, excludeBookingId = null) {
  if (!staffMemberId) return false;

  const where = {
    staffMemberId,
    status: { notIn: ['cancelled'] },
    deletedAt: null,
    OR: [
      { startTime: { lt: endTime }, endTime: { gt: startTime } },
    ],
  };
  if (excludeBookingId) where.id = { not: excludeBookingId };

  const conflict = await prisma.booking.findFirst({ where });
  return !!conflict;
}

// GET /api/bookings — List bookings (filterable)
router.get('/', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const { date, status, staffId, page = 1, limit = 50 } = req.query;
    const where = { businessId: business.id, deletedAt: null };

    if (date) {
      const dayStart = new Date(date + 'T00:00:00Z');
      const dayEnd = new Date(date + 'T23:59:59Z');
      where.startTime = { gte: dayStart, lte: dayEnd };
    }
    if (status) where.status = status;
    if (staffId) where.staffMemberId = staffId;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: { customer: true, service: true, staffMember: { select: { id: true, name: true, avatarColor: true } } },
        orderBy: [{ startTime: 'asc' }],
        skip: (page - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.booking.count({ where }),
    ]);

    // Format for frontend compatibility
    const formatted = bookings.map(b => ({
      ...b,
      date: b.startTime.toISOString().split('T')[0],
      time: b.startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      amount: b.amountCents / 100,
    }));

    res.json({ bookings: formatted, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bookings — Create booking
router.post('/', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const { customerName, phone, serviceId, staffMemberId, date, time, amount, notes } = req.body;

    if (!customerName || !date || !time) {
      return res.status(400).json({ error: 'customerName, date, time are required' });
    }

    // Parse date/time into UTC DateTime
    const startTime = new Date(`${date}T${time}:00`);
    if (isNaN(startTime.getTime())) {
      return res.status(400).json({ error: 'Invalid date or time format' });
    }

    // Calculate end time from service duration
    const service = serviceId ? await prisma.service.findUnique({ where: { id: serviceId } }) : null;
    const durationMin = service?.durationMin || 30;
    const endTime = new Date(startTime.getTime() + durationMin * 60 * 1000);

    // Check for double booking
    if (staffMemberId) {
      const bufferMin = business.settings?.bufferMinutes || 10;
      const bufferedEnd = new Date(endTime.getTime() + bufferMin * 60 * 1000);
      const conflict = await checkDoubleBooking(staffMemberId, startTime, bufferedEnd);
      if (conflict) {
        return res.status(409).json({ error: 'This time slot is already booked for the selected team member' });
      }
    }

    // Upsert customer
    const avatarColors = ['#6366f1', '#10b981', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4', '#ec4899'];
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

    const amountCents = amount ? Math.round(Number(amount) * 100) : (service?.priceCents || 0);

    const booking = await prisma.booking.create({
      data: {
        businessId: business.id,
        customerId: customer?.id || null,
        serviceId: serviceId || null,
        staffMemberId: staffMemberId || null,
        startTime,
        endTime,
        amountCents,
        notes: notes || null,
        status: 'confirmed',
        source: 'manual',
        cancelToken: uuidv4(),
        rescheduleToken: uuidv4(),
      },
      include: { customer: true, service: true, staffMember: { select: { id: true, name: true } } },
    });

    // Send confirmation via WhatsApp (LLM-generated)
    if (customer?.phone) {
      generateBookingConfirmation(customer, booking, business, service)
        .then(msg => sendTextMessage(customer.phone.replace(/\D/g, ''), msg))
        .catch(console.error);

      // Schedule reminders (24h, 2h, review request)
      scheduleBookingReminders(booking, business).catch(console.error);
    }

    // Update analytics
    const dateStr = startTime.toISOString().split('T')[0];
    await prisma.analyticsDaily.upsert({
      where: { businessId_date: { businessId: business.id, date: dateStr } },
      update: { revenueCents: { increment: amountCents }, bookingCount: { increment: 1 } },
      create: { businessId: business.id, date: dateStr, revenueCents: amountCents, bookingCount: 1 },
    });

    // Format for frontend
    const formatted = {
      ...booking,
      date: booking.startTime.toISOString().split('T')[0],
      time: booking.startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      amount: booking.amountCents / 100,
    };

    res.status(201).json({ booking: formatted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/bookings/:id — Update booking status or details
router.patch('/:id', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const existing = await prisma.booking.findFirst({
      where: { id: req.params.id, businessId: business.id, deletedAt: null },
    });
    if (!existing) return res.status(404).json({ error: 'Booking not found' });

    const { status, date, time, amount, notes, serviceId, staffMemberId } = req.body;

    // If rescheduling, recalculate times
    let startTime, endTime;
    if (date && time) {
      startTime = new Date(`${date}T${time}:00`);
      const service = serviceId
        ? await prisma.service.findUnique({ where: { id: serviceId } })
        : await prisma.service.findUnique({ where: { id: existing.serviceId || '' } }).catch(() => null);
      const durationMin = service?.durationMin || 30;
      endTime = new Date(startTime.getTime() + durationMin * 60 * 1000);
    }

    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: {
        status,
        startTime, endTime,
        amountCents: amount ? Math.round(Number(amount) * 100) : undefined,
        notes, serviceId, staffMemberId,
      },
      include: { customer: true, service: true, staffMember: { select: { id: true, name: true } } },
    });

    // Update customer stats if completed
    if (status === 'completed' && booking.customerId) {
      await prisma.customer.update({
        where: { id: booking.customerId },
        data: {
          totalSpentCents: { increment: booking.amountCents },
          totalVisits: { increment: 1 },
          lastVisit: new Date(),
        },
      });
    }

    // Update analytics for no-shows
    if (status === 'no_show') {
      const dateStr = booking.startTime.toISOString().split('T')[0];
      await prisma.analyticsDaily.upsert({
        where: { businessId_date: { businessId: business.id, date: dateStr } },
        update: { noShowCount: { increment: 1 } },
        create: { businessId: business.id, date: dateStr, noShowCount: 1 },
      });
    }

    if (status === 'cancelled') {
      const dateStr = booking.startTime.toISOString().split('T')[0];
      await prisma.analyticsDaily.upsert({
        where: { businessId_date: { businessId: business.id, date: dateStr } },
        update: { cancelCount: { increment: 1 } },
        create: { businessId: business.id, date: dateStr, cancelCount: 1 },
      });
    }

    const formatted = {
      ...booking,
      date: booking.startTime.toISOString().split('T')[0],
      time: booking.startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      amount: booking.amountCents / 100,
    };

    res.json({ booking: formatted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/bookings/:id — Soft delete
router.delete('/:id', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const existing = await prisma.booking.findFirst({
      where: { id: req.params.id, businessId: business.id, deletedAt: null },
    });
    if (!existing) return res.status(404).json({ error: 'Booking not found' });

    await prisma.booking.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
