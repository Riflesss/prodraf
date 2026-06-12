const express = require('express');
const {
  createItem,
  getAllItems,
  getItemById,
  updateItem,
  deleteItem,
} = require('../controllers/itemController');
const { verifyToken, checkAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, getAllItems);
router.get('/:id', verifyToken, getItemById);
router.post('/', verifyToken, checkAdmin, createItem);
router.put('/:id', verifyToken, checkAdmin, updateItem);
router.delete('/:id', verifyToken, checkAdmin, deleteItem);

module.exports = router;