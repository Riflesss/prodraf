const mongoose = require('mongoose');

const connectDB = async (retryCount = 5, delay = 5000) => {
  for (let i = 1; i <= retryCount; i++) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI);
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
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