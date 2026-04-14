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
    const baseSlug = businessName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const existing = await prisma.business.count({ where: { slug: { startsWith: baseSlug } } });
    const slug = existing > 0 ? `${baseSlug}-${Date.now()}` : baseSlug;

    const business = await prisma.business.upsert({
      where: { firebaseUid },
      update: { name: businessName, ownerName, phone, category: category || 'Salon & Spa' },
      create: {
        firebaseUid,
        email: firebaseEmail,
        name: businessName,
        slug,
        ownerName,
        phone,
        category: category || 'Salon & Spa',
      },
    });

    // Seed default services for new businesses
    const serviceCount = await prisma.service.count({ where: { businessId: business.id } });
    if (serviceCount === 0) {
      await prisma.service.createMany({
        data: [
          { businessId: business.id, name: 'Haircut & Style', category: 'Hair', durationMin: 45, price: 800 },
          { businessId: business.id, name: 'Beard Trim', category: 'Grooming', durationMin: 20, price: 300 },
          { businessId: business.id, name: 'Hair Color', category: 'Hair', durationMin: 120, price: 1800 },
          { businessId: business.id, name: 'Facial', category: 'Skin', durationMin: 60, price: 1200 },
        ],
      });
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
      include: { services: { where: { active: true } } },
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

module.exports = router;
