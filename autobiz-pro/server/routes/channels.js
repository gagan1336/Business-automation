// server/routes/channels.js — WhatsApp & Instagram channel management
const express = require('express');
const router = express.Router();
const prisma = require('../services/db');
const firebaseAuth = require('../middleware/firebaseAuth');

async function getBusiness(firebaseUid) {
  return prisma.business.findUniqueOrThrow({ where: { firebaseUid } });
}

// GET /api/channels — list connected channels
router.get('/', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const channels = await prisma.channel.findMany({
      where: { businessId: business.id },
      orderBy: { connectedAt: 'desc' },
    });
    // Mask sensitive tokens in response
    const safe = channels.map(ch => ({
      ...ch,
      accessToken: ch.accessToken ? '••••' + ch.accessToken.slice(-6) : null,
      igAccessToken: ch.igAccessToken ? '••••' + ch.igAccessToken.slice(-6) : null,
      appSecret: ch.appSecret ? '••••' + ch.appSecret.slice(-4) : null,
    }));
    res.json({ channels: safe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/channels — connect a new channel
router.post('/', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const { platform, phoneNumberId, accessToken, verifyToken, waPhoneNumber,
            igUserId, igAccessToken, appSecret, igUsername } = req.body;

    if (!platform || !['whatsapp', 'instagram'].includes(platform)) {
      return res.status(400).json({ error: 'platform must be "whatsapp" or "instagram"' });
    }

    // Validate required fields per platform
    if (platform === 'whatsapp') {
      if (!phoneNumberId || !accessToken) {
        return res.status(400).json({ error: 'phoneNumberId and accessToken are required for WhatsApp' });
      }
    } else {
      if (!igUserId || !igAccessToken) {
        return res.status(400).json({ error: 'igUserId and igAccessToken are required for Instagram' });
      }
    }

    const channel = await prisma.channel.upsert({
      where: {
        businessId_platform: {
          businessId: business.id,
          platform,
        },
      },
      update: {
        phoneNumberId, accessToken, verifyToken, waPhoneNumber,
        igUserId, igAccessToken, appSecret, igUsername,
        active: true,
      },
      create: {
        businessId: business.id,
        platform,
        phoneNumberId, accessToken, verifyToken, waPhoneNumber,
        igUserId, igAccessToken, appSecret, igUsername,
      },
    });

    res.status(201).json({ channel: { ...channel, accessToken: channel.accessToken ? '••••' + channel.accessToken.slice(-6) : null, igAccessToken: channel.igAccessToken ? '••••' + channel.igAccessToken.slice(-6) : null, appSecret: channel.appSecret ? '••••' + channel.appSecret.slice(-4) : null } });
  } catch (err) {
    console.error('[Channels] Create error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/channels/:id — update channel
router.patch('/:id', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const existing = await prisma.channel.findFirst({
      where: { id: req.params.id, businessId: business.id },
    });
    if (!existing) return res.status(404).json({ error: 'Channel not found' });

    const { phoneNumberId, accessToken, verifyToken, waPhoneNumber,
            igUserId, igAccessToken, appSecret, igUsername, active } = req.body;

    const channel = await prisma.channel.update({
      where: { id: req.params.id },
      data: {
        ...(phoneNumberId !== undefined && { phoneNumberId }),
        ...(accessToken !== undefined && { accessToken }),
        ...(verifyToken !== undefined && { verifyToken }),
        ...(waPhoneNumber !== undefined && { waPhoneNumber }),
        ...(igUserId !== undefined && { igUserId }),
        ...(igAccessToken !== undefined && { igAccessToken }),
        ...(appSecret !== undefined && { appSecret }),
        ...(igUsername !== undefined && { igUsername }),
        ...(active !== undefined && { active }),
      },
    });

    res.json({ channel: { ...channel, accessToken: channel.accessToken ? '••••' + channel.accessToken.slice(-6) : null, igAccessToken: channel.igAccessToken ? '••••' + channel.igAccessToken.slice(-6) : null, appSecret: channel.appSecret ? '••••' + channel.appSecret.slice(-4) : null } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/channels/:id — disconnect channel
router.delete('/:id', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const existing = await prisma.channel.findFirst({
      where: { id: req.params.id, businessId: business.id },
    });
    if (!existing) return res.status(404).json({ error: 'Channel not found' });

    await prisma.channel.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
