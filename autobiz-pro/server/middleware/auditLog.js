// server/middleware/auditLog.js — Privacy Audit Logger
const prisma = require('../services/db');

/**
 * Log a privacy/security-sensitive action
 */
async function logAudit(businessId, { actorId, action, entity, entityId, meta, ip }) {
  try {
    await prisma.auditLog.create({
      data: { businessId, actorId, action, entity, entityId, meta, ip },
    });
  } catch (err) {
    console.error('[Audit] Failed to log:', err.message);
  }
}

module.exports = { logAudit };
