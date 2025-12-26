// migration/run_remove_end_date.js
/**
 * Chạy migration để bỏ cột end_date khỏi system_notifications
 */

const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Đang chạy migration: remove end_date...');
    const sqlPath = path.join(__dirname, 'remove_end_date_from_system_notifications.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await client.query(sql);
    
    console.log('✅ Migration hoàn tất!');
    console.log('📋 Đã bỏ cột end_date khỏi system_notifications');
    
  } catch (error) {
    console.error('❌ Lỗi migration:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
