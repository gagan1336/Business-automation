// server/routes/services.js — Business Services (menu items)
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
    });
    res.json({ services });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/services
router.post('/', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const { name, category, durationMin, price } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'name and price are required' });
    const service = await prisma.service.create({
      data: { businessId: business.id, name, category: category || 'General', durationMin: Number(durationMin) || 30, price: Number(price) },
    });
    res.status(201).json({ service });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/services/:id
router.patch('/:id', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const { name, category, durationMin, price, active } = req.body;
    const service = await prisma.service.updateMany({
      where: { id: req.params.id, businessId: business.id },
      data: { name, category, durationMin: durationMin ? Number(durationMin) : undefined, price: price ? Number(price) : undefined, active },
    });
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
