const admin = require('firebase-admin');

// Mock auth สำหรับตอนทดสอบ
let auth;

try {
  // ตรวจสอบว่ามี Firebase config หรือไม่
  if (process.env.FIREBASE_PROJECT_ID && 
      process.env.FIREBASE_PROJECT_ID !== 'your-project-id' &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY) {
    
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    auth = admin.auth();
    console.log('✅ Firebase initialized with real config');
  } else {
    // Mock auth สำหรับการทดสอบ
    console.log('⚠️ Firebase not configured, using mock auth');
    auth = {
      verifyIdToken: async (token) => {
        if (token === 'mock-token' || token === 'test-token') {
          return { 
            uid: 'mock-uid-123', 
            email: 'test@example.com', 
            name: 'Test User' 
          };
        }
        throw new Error('Invalid token');
      }
    };
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  auth = {
    verifyIdToken: async () => { 
      throw new Error('Firebase not configured'); 
    }
  };
}

module.exports = { admin, auth };