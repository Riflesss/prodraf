const admin = require('firebase-admin');

// สำหรับตอนนี้ ใช้ mock ถ้ายังไม่มี Firebase config
let auth;

try {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PROJECT_ID !== 'your-project-id') {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    auth = admin.auth();
    console.log('✅ Firebase initialized');
  } else {
    // Mock auth for testing
    console.log('⚠️ Firebase not configured, using mock auth');
    auth = {
      verifyIdToken: async (token) => {
        if (token === 'mock-token') {
          return { uid: 'mock-uid', email: 'test@example.com', name: 'Test User' };
        }
        throw new Error('Invalid token');
      }
    };
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  auth = {
    verifyIdToken: async () => { throw new Error('Firebase not configured'); }
  };
}

module.exports = { admin, auth };