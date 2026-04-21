// server/routes/webhooks.js — WhatsApp & Instagram Inbound Webhooks
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const prisma = require('../services/db');
const { fireAutoReply } = require('../queues/automationQueue');

// ═══════════════════════════════════════════════════════════════════════════════
// WHATSAPP WEBHOOKS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/webhooks/whatsapp — Meta webhook verification
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    console.log('[Webhook] WhatsApp verification successful');
    return res.status(200).send(challenge);
  }
  console.warn('[Webhook] WhatsApp verification failed — token mismatch');
  return res.sendStatus(403);
});

// POST /api/webhooks/whatsapp — Receive inbound messages
router.post('/whatsapp', async (req, res) => {
  // Respond 200 immediately as per Meta requirement
  res.sendStatus(200);

  try {
    // Parse raw body (express.raw was applied in index.js for /api/webhooks)
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : 
                 Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;

    // Verify signature if APP_SECRET is configured
    if (process.env.INSTAGRAM_APP_SECRET && req.headers['x-hub-signature-256']) {
      const signature = req.headers['x-hub-signature-256'];
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
      const expectedSig = 'sha256=' + crypto
        .createHmac('sha256', process.env.INSTAGRAM_APP_SECRET)
        .update(rawBody)
        .digest('hex');
      if (signature !== expectedSig) {
        console.warn('[Webhook] WhatsApp signature verification failed');
        return;
      }
    }

    if (!body?.entry) return;

    for (const entry of body.entry) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;
        const value = change.value;
        if (!value?.messages) continue;

        const phoneNumberId = value.metadata?.phone_number_id;
        const contactPhone = value.contacts?.[0]?.wa_id;
        const contactName = value.contacts?.[0]?.profile?.name || 'Unknown';

        for (const message of value.messages) {
          if (message.type !== 'text') continue;
          const messageText = message.text?.body;
          if (!messageText) continue;

          console.log(`[Webhook] WhatsApp message from ${contactPhone}: ${messageText.substring(0, 50)}`);

          // Find the business that owns this phone number ID via the Channel
          const channel = await prisma.channel.findFirst({
            where: { platform: 'whatsapp', phoneNumberId: phoneNumberId, active: true },
            include: { business: true }
          });
          
          if (!channel || !channel.business) {
            console.warn(`[Webhook] No active WhatsApp channel found for phoneNumberId: ${phoneNumberId}`);
            continue;
          }
          
          const business = channel.business;

          // Upsert conversation
          const conversation = await prisma.conversation.upsert({
            where: {
              businessId_platform_waContactId: {
                businessId: business.id,
                platform: 'whatsapp',
                waContactId: contactPhone,
              },
            },
            update: {
              customerName: contactName,
              unreadCount: { increment: 1 },
              lastMessageAt: new Date(),
            },
            create: {
              businessId: business.id,
              platform: 'whatsapp',
              waContactId: contactPhone,
              customerName: contactName,
              unreadCount: 1,
            },
          });

          // Save incoming message
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              text: messageText,
              fromRole: 'customer',
            },
          });

          // Enqueue auto-reply job (non-blocking)
          fireAutoReply(conversation.id, contactPhone, messageText, business)
            .catch(err => console.error('[Webhook] Auto-reply queue error:', err.message));
        }
      }
    }
  } catch (err) {
    console.error('[Webhook] WhatsApp processing error:', err.message);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INSTAGRAM WEBHOOKS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/webhooks/instagram — Meta webhook verification
router.get('/instagram', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
    console.log('[Webhook] Instagram verification successful');
    return res.status(200).send(challenge);
  }
  console.warn('[Webhook] Instagram verification failed — token mismatch');
  return res.sendStatus(403);
});

// POST /api/webhooks/instagram — Receive Instagram DMs
router.post('/instagram', async (req, res) => {
  // Respond 200 immediately
  res.sendStatus(200);

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) :
                 Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;

    // Verify signature
    if (process.env.INSTAGRAM_APP_SECRET && req.headers['x-hub-signature-256']) {
      const signature = req.headers['x-hub-signature-256'];
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
      const expectedSig = 'sha256=' + crypto
        .createHmac('sha256', process.env.INSTAGRAM_APP_SECRET)
        .update(rawBody)
        .digest('hex');
      if (signature !== expectedSig) {
        console.warn('[Webhook] Instagram signature verification failed');
        return;
      }
    }

    if (!body?.entry) return;

    for (const entry of body.entry) {
      for (const messaging of entry.messaging || []) {
        if (!messaging.message?.text) continue;

        const senderId = messaging.sender?.id;
        const messageText = messaging.message.text;

        console.log(`[Webhook] Instagram DM from ${senderId}: ${messageText.substring(0, 50)}`);

        // Look up the business matching this Instagram User ID or just the first if Instagram doesn't pass a unique identifier in receiver yet? Wait, Instagram webhooks might not send the receiver's ID in `messaging.sender.id`. Actually, `messaging.recipient.id` is the business IG User ID. Let's look for `messaging.recipient.id`.
        const recipientId = messaging.recipient?.id;
        if (!recipientId) continue;

        const channel = await prisma.channel.findFirst({
          where: { platform: 'instagram', igUserId: recipientId, active: true },
          include: { business: true }
        });

        if (!channel || !channel.business) {
          console.warn(`[Webhook] No active Instagram channel found for recipientId: ${recipientId}`);
          continue;
        }

        const business = channel.business;

        // Upsert conversation
        const conversation = await prisma.conversation.upsert({
          where: {
            businessId_platform_waContactId: {
              businessId: business.id,
              platform: 'instagram',
              waContactId: senderId,
            },
          },
          update: {
            unreadCount: { increment: 1 },
            lastMessageAt: new Date(),
          },
          create: {
            businessId: business.id,
            platform: 'instagram',
            waContactId: senderId,
            customerName: `IG User ${senderId.slice(-4)}`,
            unreadCount: 1,
          },
        });

        // Save message
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            text: messageText,
            fromRole: 'customer',
          },
        });

        // Queue auto-reply
        fireAutoReply(conversation.id, senderId, messageText, business)
          .catch(err => console.error('[Webhook] IG auto-reply error:', err.message));
      }
    }
  } catch (err) {
    console.error('[Webhook] Instagram processing error:', err.message);
  }
});

module.exports = router;
