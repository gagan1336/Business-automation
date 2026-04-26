// server/queues/client.js — DEPRECATED (Redis/BullMQ removed)
// All automation is now handled by server/services/scheduler.js + server/services/llm.js
module.exports = {
  createQueue: () => null,
  createWorker: () => null,
};
