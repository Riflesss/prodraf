const express = require('express');
const AuditLog = require('../models/AuditLog');
const { verifyToken, checkAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all logs (Admin only)
router.get('/', verifyToken, checkAdmin, async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
