const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

// Script để thêm cột is_2fa_enabled
async function runAddTwoFA() {
  try {
    console.log('🔄 Đang thêm cột is_2fa_enabled vào bảng users...');
    
    // Đọc file SQL
    const sqlFile = path.join(__dirname, 'add_2fa_column.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Chạy SQL
    await pool.query(sql);
    
    console.log('✅ Thêm cột thành công!');
    console.log('📊 Bảng users đã có cột is_2fa_enabled (mặc định: FALSE)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi thêm cột:', error.message);
    process.exit(1);
  }
}

// Chạy migration
runAddTwoFA();
