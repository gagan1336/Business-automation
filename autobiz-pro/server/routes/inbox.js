// server/routes/inbox.js — Conversations & Messages
const express = require('express');
const router = express.Router();
const prisma = require('../services/db');
const firebaseAuth = require('../middleware/firebaseAuth');
const { sendTextMessage } = require('../services/whatsapp');

async function getBusiness(firebaseUid) {
  return prisma.business.findUniqueOrThrow({ where: { firebaseUid } });
}

// Safe cancelFollowUp — won't crash if Redis is unavailable
async function safeCancelFollowUp(conversationId) {
  try {
    const { cancelFollowUp } = require('../queues/automationQueue');
    await cancelFollowUp(conversationId);
  } catch (_) { /* Redis not available, ignore */ }
}

// GET /api/conversations
router.get('/', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const conversations = await prisma.conversation.findMany({
      where: { businessId: business.id },
      include: {
        messages: { orderBy: { sentAt: 'desc' }, take: 1 },
        customer: true,
      },
      orderBy: { lastMessageAt: 'desc' },
    });
    res.json({ conversations });
  } catch (err) {
    console.error('[Inbox] List conversations error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/conversations/:id/messages
router.get('/:id/messages', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const conv = await prisma.conversation.findFirst({
      where: { id: req.params.id, businessId: business.id },
    });
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });

    const messages = await prisma.message.findMany({
      where: { conversationId: req.params.id },
      orderBy: { sentAt: 'asc' },
    });

    // Mark as read
    await prisma.conversation.update({
      where: { id: req.params.id },
      data: { unreadCount: 0 },
    });

    res.json({ messages, conversation: conv });
  } catch (err) {
    console.error('[Inbox] Load messages error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/conversations — Create a new conversation (initiate a chat)
router.post('/', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const { platform, customerPhone, customerName } = req.body;

    if (!platform || !['whatsapp', 'instagram'].includes(platform)) {
      return res.status(400).json({ error: 'platform must be "whatsapp" or "instagram"' });
    }
    if (!customerPhone) {
      return res.status(400).json({ error: 'customerPhone is required' });
    }

    const phone = customerPhone.replace(/\D/g, '');

    // Check if conversation already exists
    const existing = await prisma.conversation.findFirst({
      where: {
        businessId: business.id,
        platform,
        waContactId: phone,
      },
      include: { messages: { orderBy: { sentAt: 'desc' }, take: 1 }, customer: true },
    });

    if (existing) {
      return res.json({ conversation: existing, existed: true });
    }

    // Try to link to existing customer
    let customerId = null;
    try {
      const customer = await prisma.customer.findUnique({
        where: { businessId_phone: { businessId: business.id, phone } }
      });
      if (customer) customerId = customer.id;
    } catch (_) { /* ignore */ }

    const conversation = await prisma.conversation.create({
      data: {
        businessId: business.id,
        platform,
        waContactId: phone,
        customerName: customerName || `+${phone}`,
        unreadCount: 0,
        ...(customerId && { customerId }),
      },
      include: { messages: { orderBy: { sentAt: 'desc' }, take: 1 }, customer: true },
    });

    res.status(201).json({ conversation, existed: false });
  } catch (err) {
    console.error('[Inbox] Create conversation error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/conversations/:id/messages — Send message
router.post('/:id/messages', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'text is required' });

    const conv = await prisma.conversation.findFirst({
      where: { id: req.params.id, businessId: business.id },
    });
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });

    // Save to DB
    const message = await prisma.message.create({
      data: { conversationId: conv.id, text: text.trim(), fromRole: 'business' },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conv.id },
      data: { lastMessageAt: new Date() },
    });

    // Send via WhatsApp using channel credentials from DB
    if (conv.platform === 'whatsapp' && conv.waContactId) {
      try {
        const channel = await prisma.channel.findFirst({
          where: { businessId: business.id, platform: 'whatsapp', active: true }
        });
        if (channel && channel.accessToken && channel.phoneNumberId) {
          await sendTextMessage(conv.waContactId, text.trim(), {
            accessToken: channel.accessToken,
            phoneNumberId: channel.phoneNumberId,
          });
          console.log(`[Inbox] WhatsApp message sent to ${conv.waContactId}`);
        } else {
          // Fallback to env vars
          await sendTextMessage(conv.waContactId, text.trim());
        }
      } catch (waErr) {
        console.error('[Inbox] WhatsApp send failed:', waErr.response?.data || waErr.message);
        // Don't fail the API — message is saved to DB, just wasn't delivered via WA
      }
    }

    // Cancel pending follow-up since business just replied
    safeCancelFollowUp(conv.id);

    res.status(201).json({ message });
  } catch (err) {
    console.error('[Inbox] Send message error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
