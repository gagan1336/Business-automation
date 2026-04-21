// server/routes/public.js — Public-facing endpoints (NO auth required)
const express = require('express');
const router = express.Router();
const { rateLimit } = require('express-rate-limit');
const prisma = require('../services/db');
const { sendBookingConfirmation } = require('../services/whatsapp');
const { scheduleBookingReminder } = require('../queues/automationQueue');

// Strict rate limiter for public booking submissions (10 req / 15 min per IP)
const publicBookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many booking requests. Please try again in a few minutes.' },
});

// GET /api/public/business/:slug — Business info + active services
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
        services: {
          where: { active: true },
          select: {
            id: true,
            name: true,
            category: true,
            durationMin: true,
            price: true,
          },
          orderBy: { category: 'asc' },
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

// POST /api/public/bookings — Submit a public booking (NO auth required)
router.post('/bookings', publicBookingLimiter, async (req, res) => {
  try {
    const { businessSlug, customerName, phone, serviceId, date, time, email } = req.body;

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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format (expected YYYY-MM-DD)' });
    }

    // Find business by slug
    const business = await prisma.business.findUnique({ where: { slug: businessSlug } });
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Upsert customer by phone within this business
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
      },
    });

    // Get service details if provided
    let service = null;
    let amount = 0;
    if (serviceId) {
      service = await prisma.service.findFirst({
        where: { id: serviceId, businessId: business.id, active: true },
      });
      if (service) amount = service.price;
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        businessId: business.id,
        customerId: customer.id,
        serviceId: service?.id || null,
        date,
        time,
        amount,
        status: 'confirmed',
        notes: 'Booked online via public page',
      },
      include: { customer: true, service: true },
    });

    // Update daily analytics
    await prisma.analyticsDaily.upsert({
      where: { businessId_date: { businessId: business.id, date } },
      update: { revenue: { increment: amount }, bookingCount: { increment: 1 } },
      create: { businessId: business.id, date, revenue: amount, bookingCount: 1 },
    });

    // Send WhatsApp confirmation (non-blocking)
    if (customer.phone) {
      sendBookingConfirmation(
        customer.phone,
        customer.name,
        service?.name || 'appointment',
        date,
        time,
        business.slug
      ).catch(err => console.error('[Public] WhatsApp send error:', err.message));

      // Schedule reminder 2h before
      scheduleBookingReminder(booking, customer, business).catch(err =>
        console.error('[Public] Reminder schedule error:', err.message)
      );
    }

    res.status(201).json({
      success: true,
      booking: {
        id: booking.id,
        date: booking.date,
        time: booking.time,
        service: service?.name || 'Appointment',
        amount: booking.amount,
      },
    });
  } catch (err) {
    console.error('[Public] Booking error:', err.message);
    res.status(500).json({ error: 'Failed to create booking. Please try again.' });
  }
});

module.exports = router;
