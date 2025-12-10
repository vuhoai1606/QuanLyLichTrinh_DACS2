const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

// Script để thêm gender và phone_number
async function runAddProfileFields() {
  try {
    console.log('🔄 Đang thêm cột gender và phone_number vào bảng users...');
    
    // Đọc file SQL
    const sqlFile = path.join(__dirname, 'add_profile_fields.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Chạy SQL
    await pool.query(sql);
    
    console.log('✅ Thêm cột thành công!');
    console.log('📊 Bảng users đã có:');
    console.log('  - gender (VARCHAR) - Nam/Nữ/Khác');
    console.log('  - phone_number (VARCHAR) - Tùy chọn');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi thêm cột:', error.message);
    process.exit(1);
  }
}

// Chạy migration
runAddProfileFields();
