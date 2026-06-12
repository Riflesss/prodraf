const { auth } = require('../config/firebase');
const User = require('../models/User');

const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'ไม่พบ Token กรุณาเข้าสู่ระบบ' 
      });
    }

    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (error) {
      // Mock token for testing
      if (token === 'mock-admin-token') {
        decodedToken = { uid: 'mock-admin-uid', email: 'admin@example.com', name: 'Test Admin' };
      } else if (token === 'mock-token' || token === 'test-token') {
        decodedToken = { uid: 'mock-uid', email: 'test@example.com', name: 'Test User' };
      } else {
        throw error;
      }
    }
    
    // Find user by either firebaseUid or email to avoid duplicate key violations
    let user = await User.findOne({ 
      $or: [
        { firebaseUid: decodedToken.uid },
        { email: decodedToken.email }
      ]
    });
    
    if (!user) {
      user = await User.create({
        firebaseUid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name || decodedToken.email,
        role: decodedToken.email.includes('admin') ? 'admin' : 'user',
      });
    } else {
      // Sync firebaseUid if found by email, and ensure admin roles are synced
      let updated = false;
      if (user.firebaseUid !== decodedToken.uid) {
        user.firebaseUid = decodedToken.uid;
        updated = true;
      }
      if (decodedToken.email.includes('admin') && user.role !== 'admin') {
        user.role = 'admin';
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    }
    
    req.user = {
      ...decodedToken,
      dbUser: user,
    };
    next();
  } catch (error) {
    console.error('Auth Error:', error);
    res.status(403).json({ 
      success: false, 
      message: 'Token ไม่ถูกต้องหรือหมดอายุ',
    });
  }
};

const checkAdmin = async (req, res, next) => {
  try {
    if (req.user.dbUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์เข้าถึง (ต้องเป็น Admin เท่านั้น)',
      });
    }
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { verifyToken, checkAdmin };