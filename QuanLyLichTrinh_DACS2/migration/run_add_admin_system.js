const pool = require('../config/db');

/**
 * RUN MIGRATION: Admin System
 * Chạy file add_admin_system.sql để thêm bảng admin_logs, system_notifications, user_activity_stats
 */

async function runAdminMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Bắt đầu migration admin system...\n');
    
    const fs = require('fs');
    const path = require('path');
    
    // Đọc file SQL
    const sqlPath = path.join(__dirname, 'add_admin_system.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Thực thi SQL
    await client.query(sql);
    
    console.log('\n✅ Migration thành công!');
    console.log('📊 Các bảng đã được tạo:');
    console.log('   - admin_logs (audit trail)');
    console.log('   - system_notifications');
    console.log('   - user_activity_stats');
    console.log('\n🎉 Hệ thống admin đã sẵn sàng!\n');
    
  } catch (error) {
    console.error('❌ Lỗi migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Chạy migration
runAdminMigration()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
