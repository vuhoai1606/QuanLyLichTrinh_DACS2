// migration/run_full_schema.js
/**
 * Chạy file full_schema.sql để tạo lại toàn bộ database structure
 * CẢNH BÁO: Chỉ chạy file này khi muốn khởi tạo database mới
 * hoặc restore lại cấu trúc database
 */

const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function runFullSchema() {
  const client = await pool.connect();
  
  try {
    console.log('📚 Đang đọc file full_schema.sql...');
    const sqlPath = path.join(__dirname, 'full_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('🚀 Bắt đầu tạo database schema...');
    await client.query(sql);
    
    console.log('✅ Đã tạo xong toàn bộ cấu trúc database!');
    console.log('📊 Các bảng đã được tạo:');
    console.log('   - users (người dùng)');
    console.log('   - categories (danh mục)');
    console.log('   - tasks (công việc)');
    console.log('   - events (sự kiện)');
    console.log('   - shared_events (chia sẻ sự kiện)');
    console.log('   - chat_groups (nhóm chat)');
    console.log('   - group_members (thành viên nhóm)');
    console.log('   - messages (tin nhắn)');
    console.log('   - alarm_sounds (âm báo)');
    console.log('   - notifications (thông báo cá nhân)');
    console.log('   - otp_codes (mã OTP)');
    console.log('   - activity_logs (nhật ký hoạt động)');
    console.log('   - user_sessions (phiên đăng nhập)');
    console.log('   - sprints (sprint agile)');
    console.log('   - conversations (cuộc trò chuyện)');
    console.log('   - admin_logs (nhật ký admin)');
    console.log('   - system_notifications (thông báo hệ thống)');
    console.log('   - user_activity_stats (thống kê hoạt động)');
    
  } catch (error) {
    console.error('❌ Lỗi khi chạy full schema:', error.message);
    console.error('Chi tiết:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runFullSchema();
