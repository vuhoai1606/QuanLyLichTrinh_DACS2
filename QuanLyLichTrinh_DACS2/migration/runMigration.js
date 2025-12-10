const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

// Script để chạy migration từ Node.js
async function runMigration() {
  try {
    console.log('🔄 Đang chạy migration...');
    
    // Đọc file SQL
    const sqlFile = path.join(__dirname, 'init_database.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Chạy SQL
    await pool.query(sql);
    
    console.log('✅ Migration hoàn tất!');
    console.log('📊 Database đã được khởi tạo thành công.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi chạy migration:', error.message);
    process.exit(1);
  }
}

// Chạy migration
runMigration();
