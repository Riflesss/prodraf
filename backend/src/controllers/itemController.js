const Item = require('../models/Item');
const AuditLog = require('../models/AuditLog');

const createItem = async (req, res) => {
  try {
    const item = await Item.create(req.body);
    await AuditLog.create({
      action: 'CREATE_ITEM',
      details: `สร้างสินค้าใหม่: ${item.name} (จำนวนรวม: ${item.totalQuantity} ${item.unit})`,
      performedBy: req.user?.dbUser?.email || 'System',
    });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getAllItems = async (req, res) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'ไม่พบสินค้า' });
    }
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Item.findByIdAndUpdate(id, req.body, { new: true });
    if (!item) {
      return res.status(404).json({ success: false, message: 'ไม่พบสินค้า' });
    }
    await AuditLog.create({
      action: 'UPDATE_ITEM',
      details: `อัปเดตสินค้า: ${item.name} (คงเหลือ: ${item.availableQuantity}/${item.totalQuantity} ${item.unit})`,
      performedBy: req.user?.dbUser?.email || 'System',
    });
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'ไม่พบสินค้า' });
    }
    await Item.findByIdAndDelete(id);
    await AuditLog.create({
      action: 'DELETE_ITEM',
      details: `ลบสินค้า: ${item.name}`,
      performedBy: req.user?.dbUser?.email || 'System',
    });
    res.status(200).json({ success: true, message: 'ลบสินค้าเรียบร้อย' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  createItem,
  getAllItems,
  getItemById,
  updateItem,
  deleteItem,
};