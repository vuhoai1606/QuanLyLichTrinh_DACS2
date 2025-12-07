// Script chạy migration update_phone_constraint.sql
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function runMigration() {
  try {
    console.log('🔄 Đang cập nhật phone_number constraint...');
    
    const sql = fs.readFileSync(
      path.join(__dirname, 'update_phone_constraint.sql'), 
      'utf8'
    );
    
    await pool.query(sql);
    
    console.log('✅ Cập nhật phone_number constraint thành công!');
    console.log('📋 Thay đổi:');
    console.log('   - Kiểu dữ liệu: VARCHAR(10)');
    console.log('   - Constraint: Chỉ chấp nhận 10 chữ số');
    console.log('   - Dữ liệu không hợp lệ đã được xóa (set NULL)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi chạy migration:', error);
    process.exit(1);
  }
}

runMigration();
