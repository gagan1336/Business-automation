// server/routes/inbox.js — Conversations & Messages
const express = require('express');
const router = express.Router();
const prisma = require('../services/db');
const firebaseAuth = require('../middleware/firebaseAuth');
const { sendTextMessage } = require('../services/whatsapp');
const { cancelFollowUp } = require('../queues/automationQueue');

async function getBusiness(firebaseUid) {
  return prisma.business.findUniqueOrThrow({ where: { firebaseUid } });
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

    // Send via WhatsApp
    if (conv.platform === 'whatsapp' && conv.waContactId) {
      const channel = await prisma.channel.findFirst({
        where: { businessId: business.id, platform: 'whatsapp', active: true }
      });
      if (channel) {
        sendTextMessage(conv.waContactId, text.trim(), channel).catch(console.error);
      } else {
        sendTextMessage(conv.waContactId, text.trim()).catch(console.error); // fallback
      }
    }

    // Cancel pending follow-up since business just replied
    cancelFollowUp(conv.id).catch(console.error);

    res.status(201).json({ message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
