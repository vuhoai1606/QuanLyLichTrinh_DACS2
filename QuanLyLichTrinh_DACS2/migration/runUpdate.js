const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

/**
 * Script để chạy file update_database.sql
 * Cập nhật các bảng và thêm tính năng mới vào database
 */
async function runUpdate() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Đang cập nhật database...');
    
    // Bắt đầu transaction
    await client.query('BEGIN');
    
    // Đọc file SQL
    const sqlFile = path.join(__dirname, 'update_database.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Chạy SQL
    await client.query(sql);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('✅ Cập nhật database hoàn tất!');
    console.log('📊 Các thay đổi:');
    console.log('   - Thêm bảng otp_codes (lưu mã OTP)');
    console.log('   - Thêm bảng activity_logs (lịch sử hoạt động)');
    console.log('   - Cập nhật bảng users (Google OAuth, email verification)');
    console.log('   - Cập nhật bảng tasks (tags, attachments, progress)');
    console.log('   - Cập nhật bảng events (location, meeting_link, tags)');
    
    process.exit(0);
  } catch (error) {
    // Rollback nếu có lỗi
    await client.query('ROLLBACK');
    console.error('❌ Lỗi khi cập nhật database:', error.message);
    console.error('📝 Chi tiết:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

// Chạy update
runUpdate();
