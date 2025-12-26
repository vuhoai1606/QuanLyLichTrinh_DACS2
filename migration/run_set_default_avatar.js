// migration/run_set_default_avatar.js
// Chạy migration để set avatar mặc định

const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function runMigration() {
  try {
    console.log('🔧 Bắt đầu migration: Set default avatar...');
    
    const sqlPath = path.join(__dirname, 'set_default_avatar.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Migration thành công: Đã set avatar mặc định cho users');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration lỗi:', error);
    process.exit(1);
  }
}

runMigration();
