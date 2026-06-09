const Item = require('../models/Item');

// สร้างสินค้าใหม่
const createItem = async (req, res) => {
  try {
    const item = await Item.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ดึงรายการสินค้าทั้งหมด
const getAllItems = async (req, res) => {
  try {
    const { category, status, search } = req.query;
    const query = {};
    
    if (category) query.category = category;
    if (status) query.status = status;
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    const items = await Item.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// อัปเดตสินค้า
const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Item.findByIdAndUpdate(id, req.body, { new: true });
    if (!item) {
      return res.status(404).json({ success: false, message: 'ไม่พบสินค้า' });
    }
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ลบสินค้า
const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    await Item.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'ลบสินค้าเรียบร้อย' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  createItem,
  getAllItems,
  updateItem,
  deleteItem,
};