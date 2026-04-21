// server/middleware/firebaseAuth.js
// Verifies Firebase ID Token sent from frontend (Google Sign-In)
const admin = require('../services/firebaseAdmin');

const isFirebaseConfigured = !!(
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
);

module.exports = async function firebaseAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // Dev mode: if Firebase is not configured, allow requests with a dev header
    if (!isFirebaseConfigured) {
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // In dev mode without any token, reject
        return res.status(401).json({
          error: 'Auth required. Firebase credentials not configured — see server/.env',
        });
      }
      // Try to verify anyway (will work if app-default credentials exist)
      try {
        const idToken = authHeader.split('Bearer ')[1];
        const decoded = await admin.auth().verifyIdToken(idToken);
        req.firebaseUid = decoded.uid;
        req.firebaseEmail = decoded.email;
        return next();
      } catch {
        // Firebase verification failed without creds — reject
        return res.status(401).json({
          error: 'Token verification failed. Set FIREBASE_* credentials in server/.env',
        });
      }
    }

    // Production mode: strict token verification
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
