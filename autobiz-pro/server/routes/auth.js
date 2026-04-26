// server/routes/auth.js — Firebase Google Auth → Business registration & profile
const express = require('express');
const router = express.Router();
const prisma = require('../services/db');
const firebaseAuth = require('../middleware/firebaseAuth');

// POST /api/auth/register
// Called after Google Sign-In — creates or fetches business record
router.post('/register', firebaseAuth, async (req, res) => {
  try {
    const { businessName, ownerName, phone, category } = req.body;
    const { firebaseUid, firebaseEmail } = req;

    if (!businessName || !ownerName || !phone) {
      return res.status(400).json({ error: 'businessName, ownerName, phone are required' });
    }

    // Generate unique slug from business name
    const baseSlug = businessName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const existing = await prisma.business.count({ where: { slug: { startsWith: baseSlug } } });
    const slug = existing > 0 ? `${baseSlug}-${Date.now()}` : baseSlug;

    const business = await prisma.business.upsert({
      where: { firebaseUid },
      update: { name: businessName, ownerName, phone, category: category || 'Service Business' },
      create: {
        firebaseUid,
        email: firebaseEmail,
        name: businessName,
        slug,
        ownerName,
        phone,
        category: category || 'Service Business',
      },
    });

    // Create default business settings
    await prisma.businessSettings.upsert({
      where: { businessId: business.id },
      update: {},
      create: { businessId: business.id },
    });

    // Create owner as first staff member
    const existingStaff = await prisma.staffMember.count({ where: { businessId: business.id } });
    if (existingStaff === 0) {
      await prisma.staffMember.create({
        data: {
          businessId: business.id,
          name: ownerName,
          email: firebaseEmail,
          phone,
          role: 'owner',
          firebaseUid,
          workingHours: {
            mon: { start: '09:00', end: '17:00' },
            tue: { start: '09:00', end: '17:00' },
            wed: { start: '09:00', end: '17:00' },
            thu: { start: '09:00', end: '17:00' },
            fri: { start: '09:00', end: '17:00' },
            sat: { start: '10:00', end: '14:00' },
          },
          breaks: [{ start: '12:00', end: '13:00' }],
        },
      });
    }

    // Seed default services for new businesses (broad, not niche)
    const serviceCount = await prisma.service.count({ where: { businessId: business.id } });
    if (serviceCount === 0) {
      const services = await prisma.service.createMany({
        data: [
          { businessId: business.id, name: 'Consultation', category: 'General', durationMin: 30, priceCents: 2500 },
          { businessId: business.id, name: 'Standard Service', category: 'General', durationMin: 45, priceCents: 5000 },
          { businessId: business.id, name: 'Premium Service', category: 'Premium', durationMin: 60, priceCents: 8000 },
          { businessId: business.id, name: 'Express Service', category: 'Quick', durationMin: 15, priceCents: 1500 },
        ],
      });

      // Link all services to the owner staff member
      const allServices = await prisma.service.findMany({ where: { businessId: business.id } });
      const ownerStaff = await prisma.staffMember.findFirst({ where: { businessId: business.id, role: 'owner' } });
      if (ownerStaff) {
        await prisma.serviceStaff.createMany({
          data: allServices.map(s => ({ serviceId: s.id, staffMemberId: ownerStaff.id })),
          skipDuplicates: true,
        });
      }
    }

    res.json({ success: true, business });
  } catch (err) {
    console.error('[Auth] Register error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me — Fetch current business profile
router.get('/me', firebaseAuth, async (req, res) => {
  try {
    const business = await prisma.business.findUnique({
      where: { firebaseUid: req.firebaseUid },
      include: {
        services: { where: { active: true } },
        settings: true,
        staff: { where: { active: true }, select: { id: true, name: true, role: true, avatarColor: true } },
      },
    });
    if (!business) return res.status(404).json({ error: 'Business not found. Please register first.' });
    res.json({ business });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/auth/profile — Update business profile
router.patch('/profile', firebaseAuth, async (req, res) => {
  try {
    const { name, ownerName, phone, address, website, category } = req.body;
    const business = await prisma.business.update({
      where: { firebaseUid: req.firebaseUid },
      data: { name, ownerName, phone, address, website, category },
    });
    res.json({ success: true, business });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/auth/settings — Update business settings
router.patch('/settings', firebaseAuth, async (req, res) => {
  try {
    const business = await prisma.business.findUniqueOrThrow({ where: { firebaseUid: req.firebaseUid } });
    const {
      timezone, currency, currencySymbol, locale, dateFormat, clockFormat,
      bufferMinutes, bookingWindowDays, brandColor,
      marketingConsentRequired, autoReminder24h, autoReminder2h,
      autoReviewRequest, autoRebookingNudgeDays,
    } = req.body;

    const settings = await prisma.businessSettings.upsert({
      where: { businessId: business.id },
      update: {
        timezone, currency, currencySymbol, locale, dateFormat, clockFormat,
        bufferMinutes, bookingWindowDays, brandColor,
        marketingConsentRequired, autoReminder24h, autoReminder2h,
        autoReviewRequest, autoRebookingNudgeDays,
      },
      create: {
        businessId: business.id,
        timezone, currency, currencySymbol, locale, dateFormat, clockFormat,
        bufferMinutes, bookingWindowDays, brandColor,
      },
    });

    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
