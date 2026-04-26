// server/routes/services.js — Business Services (upgraded for priceCents)
const express = require('express');
const router = express.Router();
const prisma = require('../services/db');
const firebaseAuth = require('../middleware/firebaseAuth');

async function getBusiness(firebaseUid) {
  return prisma.business.findUniqueOrThrow({ where: { firebaseUid } });
}

// GET /api/services
router.get('/', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const services = await prisma.service.findMany({
      where: { businessId: business.id },
      orderBy: { category: 'asc' },
      include: {
        staff: {
          include: { staffMember: { select: { id: true, name: true, avatarColor: true } } },
        },
      },
    });
    // Return with backward-compatible `price` field
    const formatted = services.map(s => ({
      ...s,
      price: s.priceCents / 100,
    }));
    res.json({ services: formatted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/services
router.post('/', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const { name, category, durationMin, price, priceCents, staffMemberIds } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    // Accept either priceCents or price (dollars)
    const cents = priceCents !== undefined ? Number(priceCents) : Math.round(Number(price || 0) * 100);

    const service = await prisma.service.create({
      data: {
        businessId: business.id,
        name,
        category: category || 'General',
        durationMin: Number(durationMin) || 30,
        priceCents: cents,
      },
    });

    // Link staff members if provided
    if (staffMemberIds?.length > 0) {
      await prisma.serviceStaff.createMany({
        data: staffMemberIds.map(id => ({ serviceId: service.id, staffMemberId: id })),
        skipDuplicates: true,
      });
    }

    res.status(201).json({ service: { ...service, price: service.priceCents / 100 } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/services/:id
router.patch('/:id', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const { name, category, durationMin, price, priceCents, active, staffMemberIds } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (category !== undefined) data.category = category;
    if (durationMin !== undefined) data.durationMin = Number(durationMin);
    if (active !== undefined) data.active = active;

    // Accept either priceCents or price (dollars)
    if (priceCents !== undefined) data.priceCents = Number(priceCents);
    else if (price !== undefined) data.priceCents = Math.round(Number(price) * 100);

    await prisma.service.updateMany({
      where: { id: req.params.id, businessId: business.id },
      data,
    });

    // Update staff links if provided
    if (staffMemberIds !== undefined) {
      await prisma.serviceStaff.deleteMany({ where: { serviceId: req.params.id } });
      if (staffMemberIds.length > 0) {
        await prisma.serviceStaff.createMany({
          data: staffMemberIds.map(id => ({ serviceId: req.params.id, staffMemberId: id })),
          skipDuplicates: true,
        });
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/services/:id
router.delete('/:id', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    await prisma.service.deleteMany({ where: { id: req.params.id, businessId: business.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
