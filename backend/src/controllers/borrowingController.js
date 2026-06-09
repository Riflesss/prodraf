const Borrowing = require('../models/Borrowing');
const Item = require('../models/Item');

const createBorrowRequest = async (req, res) => {
  try {
    const { items, borrowDate, expectedReturnDate, reason } = req.body;
    const { firebaseUid } = req.user;
    const user = req.user.dbUser;

    for (const item of items) {
      const dbItem = await Item.findOne({ name: item.itemName });
      if (dbItem && dbItem.availableQuantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `สินค้า ${item.itemName} คงเหลือไม่พอ (คงเหลือ ${dbItem.availableQuantity} ${dbItem.unit})`,
        });
      }
    }

    const borrowing = await Borrowing.create({
      userId: user._id,
      firebaseUid,
      items,
      borrowDate: new Date(borrowDate),
      expectedReturnDate: new Date(expectedReturnDate),
      reason,
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'ส่งคำขอยืมสำเร็จ รอการอนุมัติ',
      data: borrowing,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getUserBorrowings = async (req, res) => {
  try {
    const { firebaseUid } = req.user;
    const borrowings = await Borrowing.find({ firebaseUid })
      .sort({ createdAt: -1 })
      .populate('approvedBy', 'displayName email');
    
    res.status(200).json({
      success: true,
      data: borrowings,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getAllBorrowings = async (req, res) => {
  try {
    const borrowings = await Borrowing.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'displayName email phone department')
      .populate('approvedBy', 'displayName email');
    
    res.status(200).json({
      success: true,
      data: borrowings,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateBorrowStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const adminUser = req.user.dbUser;
    
    const borrowing = await Borrowing.findById(id);
    if (!borrowing) {
      return res.status(404).json({ success: false, message: 'ไม่พบคำขอยืม' });
    }
    
    if (status === 'approved' && borrowing.status === 'pending') {
      for (const item of borrowing.items) {
        const dbItem = await Item.findOne({ name: item.itemName });
        if (dbItem) {
          if (dbItem.availableQuantity < item.quantity) {
            return res.status(400).json({
              success: false,
              message: `สินค้า ${item.itemName} คงเหลือไม่พอ`,
            });
          }
          dbItem.availableQuantity -= item.quantity;
          await dbItem.save();
        }
      }
      borrowing.status = 'approved';
      borrowing.approvedBy = adminUser._id;
      borrowing.approvedAt = new Date();
    } else if (status === 'rejected') {
      borrowing.status = 'rejected';
      borrowing.notes = notes;
    } else if (status === 'returned') {
      for (const item of borrowing.items) {
        const dbItem = await Item.findOne({ name: item.itemName });
        if (dbItem) {
          dbItem.availableQuantity += item.quantity;
          await dbItem.save();
        }
      }
      borrowing.status = 'returned';
      borrowing.actualReturnDate = new Date();
    } else {
      borrowing.status = status;
    }
    
    borrowing.updatedAt = new Date();
    if (notes) borrowing.notes = notes;
    
    await borrowing.save();
    
    res.status(200).json({
      success: true,
      message: `อัปเดตสถานะเป็น ${status} เรียบร้อย`,
      data: borrowing,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  createBorrowRequest,
  getUserBorrowings,
  getAllBorrowings,
  updateBorrowStatus,
};