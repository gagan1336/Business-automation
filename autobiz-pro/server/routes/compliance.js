// server/routes/compliance.js — GDPR / Privacy Compliance Endpoints
const express = require('express');
const router = express.Router();
const prisma = require('../services/db');
const firebaseAuth = require('../middleware/firebaseAuth');
const { requireRole } = require('../middleware/rbac');
const { logAudit } = require('../middleware/auditLog');

async function getBusiness(firebaseUid) {
  return prisma.business.findUniqueOrThrow({ where: { firebaseUid } });
}

// GET /api/compliance/audit-logs — View audit log (owner/manager only)
router.get('/audit-logs', firebaseAuth, requireRole('owner', 'manager'), async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const { page = 1, limit = 50 } = req.query;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { businessId: business.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.auditLog.count({ where: { businessId: business.id } }),
    ]);

    res.json({ logs, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/compliance/export/:customerId — Export all customer data (GDPR Art. 20)
router.get('/export/:customerId', firebaseAuth, requireRole('owner', 'manager'), async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.customerId, businessId: business.id },
      include: {
        bookings: { include: { service: { select: { name: true } } } },
        conversations: { include: { messages: true } },
        consentLogs: true,
      },
    });

    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    // Log this export
    await logAudit(business.id, {
      actorId: req.firebaseUid,
      action: 'customer_data_exported',
      entity: 'customer',
      entityId: customer.id,
      ip: req.ip,
    });

    res.json({
      exportedAt: new Date().toISOString(),
      customer: {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        totalVisits: customer.totalVisits,
        totalSpentCents: customer.totalSpentCents,
        marketingConsent: customer.marketingConsent,
        createdAt: customer.createdAt,
        bookings: customer.bookings.map(b => ({
          date: b.startTime,
          service: b.service?.name,
          status: b.status,
          amountCents: b.amountCents,
        })),
        messages: customer.conversations.flatMap(c =>
          c.messages.map(m => ({
            platform: c.platform,
            text: m.text,
            from: m.fromRole,
            sentAt: m.sentAt,
          }))
        ),
        consentHistory: customer.consentLogs.map(l => ({
          type: l.consentType,
          granted: l.granted,
          date: l.createdAt,
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/compliance/anonymize/:customerId — Anonymize customer (GDPR Art. 17)
router.delete('/anonymize/:customerId', firebaseAuth, requireRole('owner'), async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.customerId, businessId: business.id },
    });

    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    // Anonymize: replace PII with placeholders, keep aggregate data for analytics
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        name: 'Anonymized Customer',
        phone: `anon-${customer.id.slice(-6)}`,
        email: null,
        notes: null,
        avatarColor: '#94a3b8',
        marketingConsent: false,
        status: 'inactive',
        deletedAt: new Date(),
      },
    });

    // Delete conversation messages (keep conversation shell for analytics)
    const conversations = await prisma.conversation.findMany({
      where: { customerId: customer.id },
      select: { id: true },
    });
    for (const conv of conversations) {
      await prisma.message.deleteMany({ where: { conversationId: conv.id } });
      await prisma.conversation.update({
        where: { id: conv.id },
        data: { customerName: 'Anonymized' },
      });
    }

    // Log anonymization
    await logAudit(business.id, {
      actorId: req.firebaseUid,
      action: 'customer_anonymized',
      entity: 'customer',
      entityId: customer.id,
      ip: req.ip,
    });

    res.json({ success: true, message: 'Customer data anonymized' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/compliance/consent — Record customer consent
router.post('/consent', async (req, res) => {
  try {
    const { customerId, businessId, consentType, granted } = req.body;

    if (!customerId || !consentType || granted === undefined) {
      return res.status(400).json({ error: 'customerId, consentType, granted are required' });
    }

    const consent = await prisma.consentLog.create({
      data: {
        customerId,
        consentType,
        granted: Boolean(granted),
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    // Update customer marketing consent
    if (consentType.startsWith('marketing')) {
      await prisma.customer.update({
        where: { id: customerId },
        data: { marketingConsent: Boolean(granted) },
      });
    }

    // Log consent change
    if (businessId) {
      await logAudit(businessId, {
        action: 'consent_changed',
        entity: 'customer',
        entityId: customerId,
        meta: { consentType, granted },
        ip: req.ip,
      });
    }

    res.json({ consent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/compliance/unsubscribe — Public unsubscribe endpoint
router.post('/unsubscribe', async (req, res) => {
  try {
    const { customerId, consentType } = req.body;
    if (!customerId) return res.status(400).json({ error: 'customerId required' });

    await prisma.consentLog.create({
      data: {
        customerId,
        consentType: consentType || 'marketing_email',
        granted: false,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    await prisma.customer.update({
      where: { id: customerId },
      data: { marketingConsent: false },
    });

    res.json({ success: true, message: 'You have been unsubscribed from marketing messages.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
