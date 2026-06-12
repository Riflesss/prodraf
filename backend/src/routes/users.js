const express = require('express');
const User = require('../models/User');
const { verifyToken, checkAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/me', verifyToken, async (req, res) => {
  try {
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      action: 'LOGIN',
      details: `ผู้ใช้ ${req.user.dbUser.displayName} (${req.user.dbUser.email}) เข้าสู่ระบบ`,
      performedBy: req.user.dbUser.email,
    });
    res.status(200).json({ success: true, data: req.user.dbUser });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/', verifyToken, checkAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/:id/role', verifyToken, checkAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role, updatedAt: Date.now() },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;