// server/middleware/firebaseAuth.js
// Verifies Firebase ID Token sent from frontend (Google Sign-In)
const admin = require('../services/firebaseAdmin');

module.exports = async function firebaseAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    const idToken = authHeader.split('Bearer ')[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.firebaseUid = decoded.uid;
    req.firebaseEmail = decoded.email;
    next();
  } catch (err) {
    console.error('Firebase token verify failed:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
