// server/routes/automation.js — Automation Rules CRUD
const express = require('express');
const router = express.Router();
const prisma = require('../services/db');
const firebaseAuth = require('../middleware/firebaseAuth');

async function getBusiness(firebaseUid) {
  return prisma.business.findUniqueOrThrow({ where: { firebaseUid } });
}

// GET /api/automations
router.get('/', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const automations = await prisma.automation.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ automations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/automations — Create rule
router.post('/', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const { name, trigger, action } = req.body;
    if (!name || !trigger || !action) {
      return res.status(400).json({ error: 'name, trigger, action are required' });
    }
    const automation = await prisma.automation.create({
      data: { businessId: business.id, name, trigger, action },
    });
    res.status(201).json({ automation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/automations/:id — Toggle or update
router.patch('/:id', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const { name, trigger, action, active } = req.body;
    const automation = await prisma.automation.updateMany({
      where: { id: req.params.id, businessId: business.id },
      data: { name, trigger, action, active },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/automations/:id
router.delete('/:id', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    await prisma.automation.deleteMany({ where: { id: req.params.id, businessId: business.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
