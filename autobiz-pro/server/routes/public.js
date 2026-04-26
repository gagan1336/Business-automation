// server/routes/public.js — Public-facing endpoints (NO auth required)
const express = require('express');
const router = express.Router();
const { rateLimit } = require('express-rate-limit');
const prisma = require('../services/db');
const { generateBookingConfirmation } = require('../services/llm');
const { sendTextMessage } = require('../services/whatsapp');
const { sendEmail, sendBookingConfirmationEmail } = require('../services/mailer');
const { scheduleBookingReminders } = require('../services/scheduler');
const { v4: uuidv4 } = require('uuid');

// Strict rate limiter for public booking submissions (10 req / 15 min per IP)
const publicBookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many booking requests. Please try again in a few minutes.' },
});

// GET /api/public/business/:slug — Business info + active services + staff
router.get('/business/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug || slug.length > 100) {
      return res.status(400).json({ error: 'Invalid business slug' });
    }

    const business = await prisma.business.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        address: true,
        phone: true,
        logoUrl: true,
        settings: {
          select: {
            timezone: true,
            currency: true,
            currencySymbol: true,
            clockFormat: true,
            brandColor: true,
            bufferMinutes: true,
            bookingWindowDays: true,
          },
        },
        services: {
          where: { active: true },
          select: {
            id: true,
            name: true,
            category: true,
            durationMin: true,
            priceCents: true,
            staff: {
              select: { staffMember: { select: { id: true, name: true, avatarColor: true } } },
            },
          },
          orderBy: { category: 'asc' },
        },
        staff: {
          where: { active: true },
          select: {
            id: true,
            name: true,
            avatarColor: true,
            workingHours: true,
          },
        },
      },
    });

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json({ business });
  } catch (err) {
    console.error('[Public] Business fetch error:', err.message);
    res.status(500).json({ error: 'Failed to load business info' });
  }
});

// GET /api/public/availability — Get available slots for a staff + date
router.get('/availability', async (req, res) => {
  try {
    const { staffId, date, businessSlug } = req.query;
    if (!date || !businessSlug) {
      return res.status(400).json({ error: 'date and businessSlug are required' });
    }

    const business = await prisma.business.findUnique({
      where: { slug: businessSlug },
      include: { settings: true },
    });
    if (!business) return res.status(404).json({ error: 'Business not found' });

    const bufferMin = business.settings?.bufferMinutes || 10;

    // If staffId provided, get slots for that staff member
    // Otherwise, aggregate across all active staff
    let staffMembers;
    if (staffId) {
      const staff = await prisma.staffMember.findUnique({ where: { id: staffId } });
      staffMembers = staff ? [staff] : [];
    } else {
      staffMembers = await prisma.staffMember.findMany({
        where: { businessId: business.id, active: true },
      });
    }

    const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayOfWeek = dayMap[new Date(date + 'T12:00:00Z').getUTCDay()];

    const dayStart = new Date(date + 'T00:00:00Z');
    const dayEnd = new Date(date + 'T23:59:59Z');

    const allSlots = new Map(); // time -> { available: boolean, staffIds: [] }

    for (const staff of staffMembers) {
      const hours = staff.workingHours?.[dayOfWeek];
      if (!hours?.start || !hours?.end) continue;

      // Check time off
      const timeOff = Array.isArray(staff.timeOff) ? staff.timeOff : [];
      if (timeOff.some(t => t.date === date)) continue;

      // Get existing bookings
      const existingBookings = await prisma.booking.findMany({
        where: {
          staffMemberId: staff.id,
          startTime: { gte: dayStart, lte: dayEnd },
          status: { notIn: ['cancelled'] },
          deletedAt: null,
        },
        select: { startTime: true, endTime: true },
      });

      const breaks = Array.isArray(staff.breaks) ? staff.breaks : [];
      const [startH, startM] = hours.start.split(':').map(Number);
      const [endH, endM] = hours.end.split(':').map(Number);

      for (let h = startH; h < endH || (h === endH && 0 < endM); h++) {
        for (const m of [0, 30]) {
          if (h === startH && m < startM) continue;
          if (h === endH && m >= endM) break;
          if (h > endH) break;

          const slotTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

          // Check breaks
          const inBreak = breaks.some(b => slotTime >= b.start && slotTime < b.end);
          if (inBreak) continue;

          // Check conflicts
          const slotStartDate = new Date(`${date}T${slotTime}:00Z`);
          const isBooked = existingBookings.some(b => {
            const bookEnd = new Date(b.endTime.getTime() + bufferMin * 60 * 1000);
            return slotStartDate >= b.startTime && slotStartDate < bookEnd;
          });

          if (!allSlots.has(slotTime)) {
            allSlots.set(slotTime, { time: slotTime, available: false, staffIds: [] });
          }

          const slot = allSlots.get(slotTime);
          if (!isBooked) {
            slot.available = true;
            slot.staffIds.push(staff.id);
          }
        }
      }
    }

    const slots = Array.from(allSlots.values()).sort((a, b) => a.time.localeCompare(b.time));
    res.json({ slots, date });
  } catch (err) {
    console.error('[Public] Availability error:', err.message);
    res.status(500).json({ error: 'Failed to load availability' });
  }
});

// POST /api/public/bookings — Submit a public booking (NO auth required)
router.post('/bookings', publicBookingLimiter, async (req, res) => {
  try {
    const { businessSlug, customerName, phone, serviceId, staffMemberId, date, time, email, marketingConsent } = req.body;

    // Validate required fields
    if (!businessSlug || !customerName || !phone || !date || !time) {
      return res.status(400).json({ error: 'businessSlug, customerName, phone, date, time are required' });
    }
    if (typeof customerName !== 'string' || customerName.length > 100) {
      return res.status(400).json({ error: 'Invalid customer name' });
    }
    if (typeof phone !== 'string' || phone.length < 10 || phone.length > 20) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    // Find business by slug
    const business = await prisma.business.findUnique({
      where: { slug: businessSlug },
      include: { settings: true },
    });
    if (!business) return res.status(404).json({ error: 'Business not found' });

    // Parse date/time
    const startTime = new Date(`${date}T${time}:00`);
    if (isNaN(startTime.getTime())) {
      return res.status(400).json({ error: 'Invalid date or time' });
    }

    // Get service and calculate end time
    let service = null;
    let amountCents = 0;
    if (serviceId) {
      service = await prisma.service.findFirst({
        where: { id: serviceId, businessId: business.id, active: true },
      });
      if (service) amountCents = service.priceCents;
    }
    const durationMin = service?.durationMin || 30;
    const endTime = new Date(startTime.getTime() + durationMin * 60 * 1000);

    // Check for double booking
    if (staffMemberId) {
      const bufferMin = business.settings?.bufferMinutes || 10;
      const bufferedEnd = new Date(endTime.getTime() + bufferMin * 60 * 1000);
      const conflict = await prisma.booking.findFirst({
        where: {
          staffMemberId,
          status: { notIn: ['cancelled'] },
          deletedAt: null,
          OR: [{ startTime: { lt: bufferedEnd }, endTime: { gt: startTime } }],
        },
      });
      if (conflict) {
        return res.status(409).json({ error: 'This time slot is no longer available. Please choose another time.' });
      }
    }

    // Upsert customer
    const avatarColors = ['#6366f1', '#10b981', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4', '#ec4899'];
    const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    const customer = await prisma.customer.upsert({
      where: { businessId_phone: { businessId: business.id, phone } },
      update: { name: customerName.trim(), email: email || undefined },
      create: {
        businessId: business.id,
        name: customerName.trim(),
        phone,
        email: email || null,
        avatarColor: randomColor,
        marketingConsent: Boolean(marketingConsent),
      },
    });

    // Record consent if provided
    if (marketingConsent !== undefined) {
      await prisma.consentLog.create({
        data: {
          customerId: customer.id,
          consentType: 'marketing_email',
          granted: Boolean(marketingConsent),
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        businessId: business.id,
        customerId: customer.id,
        serviceId: service?.id || null,
        staffMemberId: staffMemberId || null,
        startTime,
        endTime,
        amountCents,
        status: 'confirmed',
        source: 'online',
        notes: 'Booked online via public page',
        cancelToken: uuidv4(),
        rescheduleToken: uuidv4(),
      },
      include: { customer: true, service: true },
    });

    // Update daily analytics
    const dateStr = startTime.toISOString().split('T')[0];
    await prisma.analyticsDaily.upsert({
      where: { businessId_date: { businessId: business.id, date: dateStr } },
      update: { revenueCents: { increment: amountCents }, bookingCount: { increment: 1 } },
      create: { businessId: business.id, date: dateStr, revenueCents: amountCents, bookingCount: 1 },
    });

    // Send LLM-generated confirmation (non-blocking)
    if (customer.phone) {
      generateBookingConfirmation(customer, booking, business, service)
        .then(msg => sendTextMessage(customer.phone.replace(/\D/g, ''), msg))
        .catch(err => console.error('[Public] WhatsApp send error:', err.message));

      // Schedule reminders
      scheduleBookingReminders(booking, business).catch(err =>
        console.error('[Public] Reminder schedule error:', err.message)
      );
    }

    // Also send email confirmation if email provided
    if (customer.email) {
      sendBookingConfirmationEmail(
        customer.email, customer.name,
        service?.name || 'Appointment',
        date, time, business.name
      ).catch(console.error);
    }

    const cancelUrl = `${process.env.FRONTEND_URL}/booking/cancel/${booking.cancelToken}`;
    const rescheduleUrl = `${process.env.FRONTEND_URL}/booking/reschedule/${booking.rescheduleToken}`;

    res.status(201).json({
      success: true,
      booking: {
        id: booking.id,
        date,
        time,
        service: service?.name || 'Appointment',
        amountCents: booking.amountCents,
        cancelUrl,
        rescheduleUrl,
      },
    });
  } catch (err) {
    console.error('[Public] Booking error:', err.message);
    res.status(500).json({ error: 'Failed to create booking. Please try again.' });
  }
});

// POST /api/public/bookings/cancel — Cancel via token
router.post('/bookings/cancel', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Cancel token required' });

    const booking = await prisma.booking.findUnique({ where: { cancelToken: token } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status === 'cancelled') return res.json({ message: 'Booking is already cancelled' });

    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'cancelled' },
    });

    // Update analytics
    const dateStr = booking.startTime.toISOString().split('T')[0];
    await prisma.analyticsDaily.upsert({
      where: { businessId_date: { businessId: booking.businessId, date: dateStr } },
      update: { cancelCount: { increment: 1 } },
      create: { businessId: booking.businessId, date: dateStr, cancelCount: 1 },
    });

    res.json({ success: true, message: 'Booking cancelled successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

module.exports = router;
