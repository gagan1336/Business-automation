// server/middleware/rbac.js — Role-Based Access Control
const prisma = require('../services/db');

/**
 * Middleware factory: restrict access to specific roles
 * Usage: router.get('/admin-only', firebaseAuth, requireRole('owner', 'manager'), handler)
 */
function requireRole(...roles) {
  return async (req, res, next) => {
    try {
      if (!req.firebaseUid) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Find staff member by firebase UID
      const staff = await prisma.staffMember.findFirst({
        where: { firebaseUid: req.firebaseUid, active: true },
      });

      // Also check if they're the business owner
      const business = await prisma.business.findUnique({
        where: { firebaseUid: req.firebaseUid },
      });

      const userRole = staff?.role || (business ? 'owner' : null);

      if (!userRole || !roles.includes(userRole)) {
        return res.status(403).json({
          error: 'Insufficient permissions. Required role: ' + roles.join(' or '),
        });
      }

      req.userRole = userRole;
      req.staffMember = staff;
      next();
    } catch (err) {
      console.error('[RBAC] Error:', err.message);
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
}

module.exports = { requireRole };
