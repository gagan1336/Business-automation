// server/queues/automationQueue.js — DEPRECATED (replaced by LLM + scheduler)
// This file is kept as a stub to prevent import errors in any remaining references.
// All automation is now handled by:
//   - server/services/scheduler.js (task scheduling via node-cron)
//   - server/services/llm.js (message generation via Gemini Flash)

module.exports = {
  QUEUE_NAME: 'deprecated',
  getQueue: () => null,
  scheduleBookingReminder: async () => console.warn('[DEPRECATED] Use scheduler.scheduleBookingReminders instead'),
  scheduleFollowUp: async () => console.warn('[DEPRECATED] Use scheduler.scheduleTask instead'),
  cancelFollowUp: async () => {},
  scheduleWalkinThanks: async () => console.warn('[DEPRECATED] Use scheduler.scheduleTask instead'),
  fireAutoReply: async () => console.warn('[DEPRECATED] Use llm.generateAutoReply instead'),
};
