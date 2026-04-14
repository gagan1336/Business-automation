// server/queues/automationQueue.js — Queue Definitions & Job Schedulers
const { createQueue } = require('./client');

const QUEUE_NAME = 'autobiz-automations';
let queue = null;

function getQueue() {
  if (!queue) queue = createQueue(QUEUE_NAME);
  return queue;
}

// ── Job Schedulers ───────────────────────────────────────────────────────────

/**
 * Schedule a booking reminder message 2 hours before appointment
 */
async function scheduleBookingReminder(booking, customer, business) {
  const q = getQueue();
  if (!q) return;
  const bookingDateTime = new Date(`${booking.date} ${booking.time}`);
  const twoHoursBefore = bookingDateTime.getTime() - Date.now() - 2 * 60 * 60 * 1000;
  if (twoHoursBefore <= 0) return; // Too late
  await q.add('booking-reminder', { booking, customer, business }, {
    delay: twoHoursBefore,
    jobId: `reminder-${booking.id}`,
    removeOnComplete: true,
    removeOnFail: 100,
  });
  console.log(`[Queue] Scheduled reminder for booking ${booking.id} in ${Math.round(twoHoursBefore / 60000)}min`);
}

/**
 * Schedule a follow-up for conversations with no reply in 24h
 */
async function scheduleFollowUp(conversationId, phone, customerName, businessId, delayMs = 24 * 60 * 60 * 1000) {
  const q = getQueue();
  if (!q) return;
  await q.add('follow-up', { conversationId, phone, customerName, businessId }, {
    delay: delayMs,
    jobId: `followup-${conversationId}`,
    removeOnComplete: true,
    removeOnFail: 100,
  });
}

/**
 * Cancel a scheduled follow-up (if customer replied)
 */
async function cancelFollowUp(conversationId) {
  const q = getQueue();
  if (!q) return;
  const job = await q?.getJob(`followup-${conversationId}`);
  if (job) await job.remove();
}

/**
 * Schedule a walk-in thank you (immediate — 10s delay)
 */
async function scheduleWalkinThanks(walkin) {
  const q = getQueue();
  if (!q) return;
  await q.add('walkin-thanks', { walkin }, {
    delay: 10000,
    removeOnComplete: true,
    removeOnFail: 100,
  });
}

/**
 * Fire an auto-reply for incoming messages matching triggers
 */
async function fireAutoReply(conversationId, phone, messageText, business) {
  const q = getQueue();
  if (!q) return;
  await q.add('auto-reply', { conversationId, phone, messageText, business }, {
    removeOnComplete: true,
    removeOnFail: 100,
  });
}

module.exports = {
  QUEUE_NAME,
  getQueue,
  scheduleBookingReminder,
  scheduleFollowUp,
  cancelFollowUp,
  scheduleWalkinThanks,
  fireAutoReply,
};
