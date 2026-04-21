// server/services/firebaseAdmin.js
// Firebase Admin SDK — initialized once, used for token verification
const admin = require('firebase-admin');

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        // Replace escaped newlines in private key (needed when loaded from .env)
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
    console.log('   Firebase Admin: initialized ✅');
  } else {
    // Initialize without credentials — auth verification will be mocked in dev
    admin.initializeApp();
    console.warn('   Firebase Admin: no credentials — using dev mode ⚠️');
  }
}

module.exports = admin;
