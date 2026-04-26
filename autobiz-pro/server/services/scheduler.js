// server/services/scheduler.js — node-cron Task Scheduler
// Replaces BullMQ: polls ScheduledTask table every 5 minutes
const cron = require('node-cron');
const prisma = require('./db');
const llm = require('./llm');
const { sendTextMessage } = require('./whatsapp');
const { sendEmail } = require('./mailer');

let isRunning = false;

// ── Task Processor ────────────────────────────────────────────────────────────

async function processTask(task) {
  const payload = typeof task.payload === 'string' ? JSON.parse(task.payload) : task.payload;

  try {
    // Mark as processing
    await prisma.scheduledTask.update({
      where: { id: task.id },
      data: { status: 'processing', attempts: { increment: 1 } },
    });

    // Load related data
    const business = await prisma.business.findUnique({
      where: { id: task.businessId },
      include: { settings: true },
    });
    if (!business) throw new Error('Business not found');

    let customer = null;
    let booking = null;
    let service = null;

    if (payload.customerId) {
      customer = await prisma.customer.findUnique({ where: { id: payload.customerId } });
    }
    if (payload.bookingId) {
      booking = await prisma.booking.findUnique({
        where: { id: payload.bookingId },
        include: { service: true, customer: true },
      });
      if (booking) {
        customer = customer || booking.customer;
        service = booking.service;
      }
    }

    if (!customer) throw new Error('Customer not found for task');

    // Generate message via LLM
    let message;
    switch (task.type) {
      case 'reminder_24h':
      case 'reminder_2h':
        message = await llm.generateReminder(task.type, customer, booking, business, service);
        break;
      case 'review_request':
        message = await llm.generateReviewRequest(customer, service, business);
        break;
      case 'rebooking_nudge':
        message = await llm.generateRebookingNudge(customer, payload.lastService, business);
        break;
      case 'follow_up':
        message = await llm.generateMessage('follow_up', {
          customerName: customer.name,
          businessName: business.name,
        });
        break;
      default:
        message = `Hi ${customer.name}! Thanks for choosing ${business.name}. 😊`;
    }

    // Send via appropriate channel
    const channel = payload.channel || 'whatsapp';
    if (channel === 'whatsapp' && customer.phone) {
      await sendTextMessage(customer.phone.replace(/\D/g, ''), message);
    } else if (channel === 'email' && customer.email) {
      await sendEmail(customer.email, `${business.name} — Reminder`, `<p>${message}</p>`, message);
    } else if (channel === 'sms' && customer.phone) {
      // Twilio SMS integration would go here
      console.log(`[Scheduler] SMS to ${customer.phone}: ${message}`);
    }

    // Mark completed
    await prisma.scheduledTask.update({
      where: { id: task.id },
      data: { status: 'completed', result: 'sent' },
    });

    console.log(`[Scheduler] ✅ Completed task ${task.id} (${task.type})`);
  } catch (err) {
    console.error(`[Scheduler] ❌ Task ${task.id} failed:`, err.message);

    const shouldRetry = task.attempts < task.maxAttempts;
    await prisma.scheduledTask.update({
      where: { id: task.id },
      data: {
        status: shouldRetry ? 'pending' : 'failed',
        result: err.message,
        // Retry after 10 minutes
        executeAt: shouldRetry ? new Date(Date.now() + 10 * 60 * 1000) : undefined,
      },
    });
  }
}

// ── Cron Job ──────────────────────────────────────────────────────────────────

async function processPendingTasks() {
  if (isRunning) return; // prevent overlapping runs
  isRunning = true;

  try {
    const tasks = await prisma.scheduledTask.findMany({
      where: {
        status: 'pending',
        executeAt: { lte: new Date() },
      },
      orderBy: { executeAt: 'asc' },
      take: 20, // process max 20 per cycle
    });

    if (tasks.length > 0) {
      console.log(`[Scheduler] Processing ${tasks.length} pending tasks...`);
      for (const task of tasks) {
        await processTask(task);
      }
    }
  } catch (err) {
    console.error('[Scheduler] Polling error:', err.message);
  } finally {
    isRunning = false;
  }
}

// ── Start Scheduler ───────────────────────────────────────────────────────────

function startScheduler() {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', processPendingTasks);
  console.log('   📅 Task scheduler: started (polling every 5min)');

  // Also run once on startup after a small delay
  setTimeout(processPendingTasks, 5000);
}

// ── Helper: Schedule a Task ───────────────────────────────────────────────────

async function scheduleTask(businessId, type, executeAt, payload) {
  return prisma.scheduledTask.create({
    data: { businessId, type, executeAt, payload },
  });
}

/**
 * Schedule booking reminders (24h + 2h before)
 */
async function scheduleBookingReminders(booking, business) {
  const settings = await prisma.businessSettings.findUnique({
    where: { businessId: business.id },
  });

  const startTime = new Date(booking.startTime);
  const now = Date.now();

  // 24h reminder
  if (settings?.autoReminder24h !== false) {
    const remind24h = new Date(startTime.getTime() - 24 * 60 * 60 * 1000);
    if (remind24h.getTime() > now) {
      await scheduleTask(business.id, 'reminder_24h', remind24h, {
        bookingId: booking.id,
        customerId: booking.customerId,
        channel: 'whatsapp',
      });
    }
  }

  // 2h reminder
  if (settings?.autoReminder2h !== false) {
    const remind2h = new Date(startTime.getTime() - 2 * 60 * 60 * 1000);
    if (remind2h.getTime() > now) {
      await scheduleTask(business.id, 'reminder_2h', remind2h, {
        bookingId: booking.id,
        customerId: booking.customerId,
        channel: 'whatsapp',
      });
    }
  }

  // Review request (24h after appointment)
  if (settings?.autoReviewRequest !== false) {
    const reviewAt = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);
    await scheduleTask(business.id, 'review_request', reviewAt, {
      bookingId: booking.id,
      customerId: booking.customerId,
      channel: 'email',
    });
  }
}

module.exports = {
  startScheduler,
  scheduleTask,
  scheduleBookingReminders,
  processPendingTasks,
};
