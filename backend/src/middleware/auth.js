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
      if (token === 'mock-token') {
        decodedToken = { uid: 'mock-uid', email: 'test@example.com' };
      } else {
        throw error;
      }
    }
    
    let user = await User.findOne({ firebaseUid: decodedToken.uid });
    
    if (!user) {
      user = await User.create({
        firebaseUid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name || decodedToken.email,
      });
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