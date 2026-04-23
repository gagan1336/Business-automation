// server/routes/webhooks.js — WhatsApp & Instagram Inbound Webhooks
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const prisma = require('../services/db');

// Safe auto-reply — only fires if Redis/BullMQ is configured
async function safeFireAutoReply(conversationId, phone, messageText, business) {
  try {
    const { fireAutoReply } = require('../queues/automationQueue');
    await fireAutoReply(conversationId, phone, messageText, business);
  } catch (err) {
    console.warn('[Webhook] Auto-reply skipped (queue not available):', err.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WHATSAPP WEBHOOKS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/webhooks/whatsapp — Meta webhook verification
router.get('/whatsapp', async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode !== 'subscribe' || !token) {
    console.warn('[Webhook] WhatsApp verification failed — missing mode or token');
    return res.sendStatus(403);
  }

  // Check against env var first
  if (token === process.env.META_VERIFY_TOKEN) {
    console.log('[Webhook] WhatsApp verification successful (env token)');
    return res.status(200).send(challenge);
  }

  // Check against any channel's verify token in DB (multi-tenant)
  try {
    const channel = await prisma.channel.findFirst({
      where: { platform: 'whatsapp', verifyToken: token, active: true },
    });
    if (channel) {
      console.log('[Webhook] WhatsApp verification successful (channel token)');
      return res.status(200).send(challenge);
    }
  } catch (err) {
    console.error('[Webhook] DB lookup error during verification:', err.message);
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
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : 
             Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;
    } catch (parseErr) {
      console.error('[Webhook] Failed to parse WhatsApp body:', parseErr.message);
      return;
    }

    if (!body?.entry) {
      console.log('[Webhook] WhatsApp — no entry in body, ignoring');
      return;
    }

    for (const entry of body.entry) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;
        const value = change.value;
        if (!value?.messages) continue;

        const phoneNumberId = value.metadata?.phone_number_id;
        const contactPhone = value.contacts?.[0]?.wa_id;
        const contactName = value.contacts?.[0]?.profile?.name || 'Unknown';

        if (!phoneNumberId || !contactPhone) {
          console.warn('[Webhook] Missing phoneNumberId or contactPhone');
          continue;
        }

        for (const message of value.messages) {
          if (message.type !== 'text') {
            console.log(`[Webhook] Skipping non-text message type: ${message.type}`);
            continue;
          }
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

          // Upsert customer (optional — link if phone matches)
          let customerId = null;
          try {
            const customer = await prisma.customer.findUnique({
              where: { businessId_phone: { businessId: business.id, phone: contactPhone } }
            });
            if (customer) customerId = customer.id;
          } catch (_) { /* ignore */ }

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
              ...(customerId && { customerId }),
            },
            create: {
              businessId: business.id,
              platform: 'whatsapp',
              waContactId: contactPhone,
              customerName: contactName,
              unreadCount: 1,
              ...(customerId && { customerId }),
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

          console.log(`[Webhook] Message saved to conversation ${conversation.id}`);

          // Enqueue auto-reply job (non-blocking, safe if no Redis)
          safeFireAutoReply(conversation.id, contactPhone, messageText, business);
        }
      }
    }
  } catch (err) {
    console.error('[Webhook] WhatsApp processing error:', err.message, err.stack);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INSTAGRAM WEBHOOKS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/webhooks/instagram — Meta webhook verification
router.get('/instagram', async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode !== 'subscribe' || !token) {
    return res.sendStatus(403);
  }

  if (token === process.env.INSTAGRAM_VERIFY_TOKEN) {
    console.log('[Webhook] Instagram verification successful (env token)');
    return res.status(200).send(challenge);
  }

  // Check channel-level verify token
  try {
    const channel = await prisma.channel.findFirst({
      where: { platform: 'instagram', verifyToken: token, active: true },
    });
    if (channel) {
      console.log('[Webhook] Instagram verification successful (channel token)');
      return res.status(200).send(challenge);
    }
  } catch (_) {}

  console.warn('[Webhook] Instagram verification failed — token mismatch');
  return res.sendStatus(403);
});

// POST /api/webhooks/instagram — Receive Instagram DMs
router.post('/instagram', async (req, res) => {
  // Respond 200 immediately
  res.sendStatus(200);

  try {
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) :
             Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;
    } catch (parseErr) {
      console.error('[Webhook] Failed to parse Instagram body:', parseErr.message);
      return;
    }

    if (!body?.entry) return;

    for (const entry of body.entry) {
      for (const messaging of entry.messaging || []) {
        if (!messaging.message?.text) continue;

        const senderId = messaging.sender?.id;
        const messageText = messaging.message.text;
        const recipientId = messaging.recipient?.id;

        if (!senderId || !recipientId) continue;

        console.log(`[Webhook] Instagram DM from ${senderId}: ${messageText.substring(0, 50)}`);

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

        console.log(`[Webhook] Instagram message saved to conversation ${conversation.id}`);

        // Queue auto-reply (safe)
        safeFireAutoReply(conversation.id, senderId, messageText, business);
      }
    }
  } catch (err) {
    console.error('[Webhook] Instagram processing error:', err.message, err.stack);
  }
});

module.exports = router;
