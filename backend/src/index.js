require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

const borrowingRoutes = require('./routes/borrowing');
const itemRoutes = require('./routes/items');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/borrowings', borrowingRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/users', userRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ 
    success: true, 
    status: 'OK', 
    message: 'Borrowing System API is running',
    timestamp: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});