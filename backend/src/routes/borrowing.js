const express = require('express');
const {
  createBorrowRequest,
  getUserBorrowings,
  getAllBorrowings,
  updateBorrowStatus,
} = require('../controllers/borrowingController');
const { verifyToken, checkAdmin } = require('../middleware/auth');

const router = express.Router();

// User routes
router.post('/', verifyToken, createBorrowRequest);
router.get('/my-borrowings', verifyToken, getUserBorrowings);

// Admin routes
router.get('/all', verifyToken, checkAdmin, getAllBorrowings);
router.put('/:id/status', verifyToken, checkAdmin, updateBorrowStatus);

module.exports = router;