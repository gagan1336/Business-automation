// server/routes/customers.js
const express = require('express');
const router = express.Router();
const prisma = require('../services/db');
const firebaseAuth = require('../middleware/firebaseAuth');

async function getBusiness(firebaseUid) {
  return prisma.business.findUniqueOrThrow({ where: { firebaseUid } });
}

// GET /api/customers?search=
router.get('/', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const { search, status, page = 1, limit = 50 } = req.query;
    const where = { businessId: business.id };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { lastVisit: 'desc' },
        skip: (page - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.customer.count({ where }),
    ]);
    res.json({ customers, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/:id — with booking history
router.get('/:id', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id, businessId: business.id },
      include: {
        bookings: {
          include: { service: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json({ customer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customers — Create customer
router.post('/', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const { name, phone, email } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'name and phone are required' });
    const colors = ['#6366f1','#10b981','#f59e0b','#a855f7','#ef4444','#06b6d4','#ec4899'];
    const customer = await prisma.customer.upsert({
      where: { businessId_phone: { businessId: business.id, phone } },
      update: { name, email },
      create: { businessId: business.id, name, phone, email, avatarColor: colors[Math.floor(Math.random() * colors.length)] },
    });
    res.status(201).json({ customer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/customers/:id
router.patch('/:id', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const { name, phone, email, status } = req.body;
    const customer = await prisma.customer.updateMany({
      where: { id: req.params.id, businessId: business.id },
      data: { name, phone, email, status },
    });
    res.json({ success: true, customer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/customers/:id
router.delete('/:id', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    await prisma.customer.deleteMany({ where: { id: req.params.id, businessId: business.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
