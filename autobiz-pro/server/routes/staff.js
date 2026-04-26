// server/routes/staff.js — Staff / Team Management
const express = require('express');
const router = express.Router();
const prisma = require('../services/db');
const firebaseAuth = require('../middleware/firebaseAuth');
const { requireRole } = require('../middleware/rbac');

async function getBusiness(firebaseUid) {
  return prisma.business.findUniqueOrThrow({ where: { firebaseUid } });
}

// GET /api/staff — List all staff members
router.get('/', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const staff = await prisma.staffMember.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { bookings: true } },
        services: { include: { service: { select: { id: true, name: true } } } },
      },
    });
    res.json({ staff });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/staff — Add staff member (owner/manager only)
router.post('/', firebaseAuth, requireRole('owner', 'manager'), async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const { name, email, phone, role, workingHours, breaks, serviceIds } = req.body;

    if (!name) return res.status(400).json({ error: 'name is required' });

    const avatarColors = ['#6366f1', '#10b981', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4', '#ec4899'];
    const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    // Default working hours: Mon-Fri 9am-5pm
    const defaultHours = {
      mon: { start: '09:00', end: '17:00' },
      tue: { start: '09:00', end: '17:00' },
      wed: { start: '09:00', end: '17:00' },
      thu: { start: '09:00', end: '17:00' },
      fri: { start: '09:00', end: '17:00' },
    };

    const staff = await prisma.staffMember.create({
      data: {
        businessId: business.id,
        name,
        email: email || null,
        phone: phone || null,
        role: role || 'staff',
        avatarColor,
        workingHours: workingHours || defaultHours,
        breaks: breaks || [],
      },
    });

    // Link services if provided
    if (serviceIds?.length > 0) {
      await prisma.serviceStaff.createMany({
        data: serviceIds.map(serviceId => ({
          serviceId,
          staffMemberId: staff.id,
        })),
        skipDuplicates: true,
      });
    }

    res.status(201).json({ staff });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/staff/:id — Update staff member
router.patch('/:id', firebaseAuth, requireRole('owner', 'manager'), async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const existing = await prisma.staffMember.findFirst({
      where: { id: req.params.id, businessId: business.id },
    });
    if (!existing) return res.status(404).json({ error: 'Staff member not found' });

    const { name, email, phone, role, workingHours, breaks, timeOff, active, serviceIds } = req.body;

    const staff = await prisma.staffMember.update({
      where: { id: req.params.id },
      data: {
        name, email, phone, role, active,
        workingHours: workingHours !== undefined ? workingHours : undefined,
        breaks: breaks !== undefined ? breaks : undefined,
        timeOff: timeOff !== undefined ? timeOff : undefined,
      },
    });

    // Update service links if provided
    if (serviceIds !== undefined) {
      await prisma.serviceStaff.deleteMany({ where: { staffMemberId: staff.id } });
      if (serviceIds.length > 0) {
        await prisma.serviceStaff.createMany({
          data: serviceIds.map(serviceId => ({ serviceId, staffMemberId: staff.id })),
          skipDuplicates: true,
        });
      }
    }

    res.json({ staff });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/staff/:id — Remove staff member (owner only)
router.delete('/:id', firebaseAuth, requireRole('owner'), async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    const existing = await prisma.staffMember.findFirst({
      where: { id: req.params.id, businessId: business.id },
    });
    if (!existing) return res.status(404).json({ error: 'Staff member not found' });

    // Don't allow deleting the owner
    if (existing.role === 'owner') {
      return res.status(400).json({ error: 'Cannot remove the business owner' });
    }

    await prisma.staffMember.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/staff/:id/availability — Get available time slots for a date
router.get('/:id/availability', async (req, res) => {
  try {
    const { date } = req.query; // YYYY-MM-DD
    if (!date) return res.status(400).json({ error: 'date query param required' });

    const staff = await prisma.staffMember.findUnique({ where: { id: req.params.id } });
    if (!staff || !staff.active) return res.status(404).json({ error: 'Staff not found' });

    const business = await prisma.business.findUnique({
      where: { id: staff.businessId },
      include: { settings: true },
    });

    const bufferMin = business?.settings?.bufferMinutes || 10;

    // Get day of week
    const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayOfWeek = dayMap[new Date(date + 'T12:00:00Z').getUTCDay()];

    // Check working hours
    const hours = staff.workingHours?.[dayOfWeek];
    if (!hours?.start || !hours?.end) {
      return res.json({ slots: [], message: 'Not working on this day' });
    }

    // Check time off
    const timeOff = Array.isArray(staff.timeOff) ? staff.timeOff : [];
    const isOff = timeOff.some(t => t.date === date);
    if (isOff) {
      return res.json({ slots: [], message: 'Day off' });
    }

    // Get existing bookings for this staff on this date
    const dayStart = new Date(date + 'T00:00:00Z');
    const dayEnd = new Date(date + 'T23:59:59Z');

    const existingBookings = await prisma.booking.findMany({
      where: {
        staffMemberId: staff.id,
        startTime: { gte: dayStart, lte: dayEnd },
        status: { not: 'cancelled' },
        deletedAt: null,
      },
      select: { startTime: true, endTime: true },
    });

    // Generate available 30-min slots
    const breaks = Array.isArray(staff.breaks) ? staff.breaks : [];
    const [startH, startM] = hours.start.split(':').map(Number);
    const [endH, endM] = hours.end.split(':').map(Number);
    const slots = [];

    for (let h = startH; h < endH || (h === endH && 0 < endM); h++) {
      for (const m of [0, 30]) {
        if (h === startH && m < startM) continue;
        if (h === endH && m >= endM) break;
        if (h > endH) break;

        const slotStart = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const slotEnd = m === 30
          ? `${String(h + 1).padStart(2, '0')}:00`
          : `${String(h).padStart(2, '0')}:30`;

        // Check if slot overlaps with break
        const inBreak = breaks.some(b => slotStart >= b.start && slotStart < b.end);
        if (inBreak) continue;

        // Check if slot overlaps with existing booking (+ buffer)
        const slotStartDate = new Date(`${date}T${slotStart}:00Z`);
        const isBooked = existingBookings.some(b => {
          const bookEnd = new Date(b.endTime.getTime() + bufferMin * 60 * 1000);
          return slotStartDate >= b.startTime && slotStartDate < bookEnd;
        });

        slots.push({ time: slotStart, available: !isBooked });
      }
    }

    res.json({ slots, workingHours: hours });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
