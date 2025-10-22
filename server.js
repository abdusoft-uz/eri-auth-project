const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: './config.env' });

const { pool, initDatabase } = require('./db');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static fayllar uchun
app.use(express.static(path.join(__dirname, 'public')));

// API yo'nalishlari
app.use('/api/auth', authRoutes);

// Asosiy sahifa
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Xatolik boshqarish
app.use((err, req, res, next) => {
  console.error('Server xatoligi:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Server ichki xatoligi' 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Sahifa topilmadi' 
  });
});

// Server ishga tushirish
const startServer = async () => {
  try {
    // Ma'lumotlar bazasini ishga tushirish
    await initDatabase();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server ${PORT} portida ishlamoqda`);
      console.log(`📱 Frontend: http://localhost:${PORT}`);
      console.log(`🔗 API: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Serverni ishga tushirishda xatolik:', error);
    process.exit(1);
  }
};

startServer();
