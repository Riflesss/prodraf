const mongoose = require('mongoose');
const Item = require('../models/Item');

const seedMockData = async () => {
  try {
    const redEst = await Item.findOne({ name: 'เอสแดง' });
    if (!redEst) {
      await Item.create({
        name: 'เอสแดง',
        category: 'other',
        totalQuantity: 2,
        availableQuantity: 2,
        unit: 'ขวด',
        description: 'เครื่องดื่ม เอสแดง รสสตรอเบอร์รี่ ชื่นใจ ดับกระหาย',
        location: 'ตู้เย็น ชั้น 1',
        status: 'active',
      });
      console.log('🌱 Seeded mock data: เอสแดง 2 ตัว');
    }
  } catch (error) {
    console.error('❌ Failed to seed mock data:', error.message);
  }
};

const connectDB = async (retryCount = 5, delay = 5000) => {
  for (let i = 1; i <= retryCount; i++) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI);
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      await seedMockData();
      return conn;
    } catch (error) {
      console.error(`❌ MongoDB connection attempt ${i} failed:`, error.message);
      if (i < retryCount) {
        console.log(`⏳ Waiting ${delay / 1000} seconds before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('❌ MongoDB connection failed after all attempts. Exiting...');
        process.exit(1);
      }
    }
  }
};

module.exports = connectDB;