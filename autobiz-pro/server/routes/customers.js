// server/routes/customers.js — Customer CRM (upgraded for new schema)
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
    const where = { businessId: business.id, deletedAt: null };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { lastVisit: { sort: 'desc', nulls: 'last' } },
        skip: (page - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.customer.count({ where }),
    ]);
    // Add backward-compatible totalSpent field
    const formatted = customers.map(c => ({
      ...c,
      totalSpent: c.totalSpentCents / 100,
    }));
    res.json({ customers: formatted, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/:id — with booking history
router.get('/:id', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id, businessId: business.id, deletedAt: null },
      include: {
        bookings: {
          where: { deletedAt: null },
          include: { service: true, staffMember: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        consentLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json({ customer: { ...customer, totalSpent: customer.totalSpentCents / 100 } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customers — Create customer
router.post('/', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const { name, phone, email, notes, marketingConsent } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'name and phone are required' });
    const colors = ['#6366f1','#10b981','#f59e0b','#a855f7','#ef4444','#06b6d4','#ec4899'];
    const customer = await prisma.customer.upsert({
      where: { businessId_phone: { businessId: business.id, phone } },
      update: { name, email, notes },
      create: {
        businessId: business.id, name, phone, email,
        notes: notes || null,
        marketingConsent: Boolean(marketingConsent),
        avatarColor: colors[Math.floor(Math.random() * colors.length)],
      },
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
    const { name, phone, email, status, notes, preferredStaffId, marketingConsent } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (email !== undefined) data.email = email;
    if (status !== undefined) data.status = status;
    if (notes !== undefined) data.notes = notes;
    if (preferredStaffId !== undefined) data.preferredStaffId = preferredStaffId;
    if (marketingConsent !== undefined) data.marketingConsent = marketingConsent;

    await prisma.customer.updateMany({
      where: { id: req.params.id, businessId: business.id },
      data,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/customers/:id — soft delete
router.delete('/:id', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    await prisma.customer.updateMany({
      where: { id: req.params.id, businessId: business.id },
      data: { deletedAt: new Date(), status: 'inactive' },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
