const { Pool } = require('pg');
require('dotenv').config({ path: './config.env' });

// PostgreSQL ulanish konfiguratsiyasi
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  database: process.env.POSTGRES_DB,
  ssl: false // Development uchun SSL o'chirilgan
});

// Ma'lumotlar bazasiga ulanishni tekshirish
pool.on('connect', () => {
  console.log('✅ PostgreSQL ma\'lumotlar bazasiga muvaffaqiyatli ulanildi');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL xatoligi:', err);
});

// Ma'lumotlar bazasi jadvallarini yaratish
const initDatabase = async () => {
  try {
    // Foydalanuvchilar jadvali
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        pinfl TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        certificate_serial TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Challenge jadvali
    await pool.query(`
      CREATE TABLE IF NOT EXISTS auth_challenges (
        id SERIAL PRIMARY KEY,
        challenge_data TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Ma\'lumotlar bazasi jadvallari muvaffaqiyatli yaratildi');
  } catch (error) {
    console.error('❌ Ma\'lumotlar bazasini yaratishda xatolik:', error);
    throw error;
  }
};

module.exports = {
  pool,
  initDatabase
};
