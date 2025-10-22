const { initDatabase } = require('../db');

// Ma'lumotlar bazasini ishga tushirish skripti
async function initializeDatabase() {
  try {
    console.log('🔄 Ma\'lumotlar bazasini ishga tushirish...');
    await initDatabase();
    console.log('✅ Ma\'lumotlar bazasi muvaffaqiyatli ishga tushirildi');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ma\'lumotlar bazasini ishga tushirishda xatolik:', error);
    process.exit(1);
  }
}

initializeDatabase();
