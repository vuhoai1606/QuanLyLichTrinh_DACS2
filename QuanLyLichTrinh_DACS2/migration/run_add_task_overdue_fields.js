const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('Đang thêm cột cho tính năng tự động chuyển cột task...');
    const sql = fs.readFileSync(path.join(__dirname, 'add_task_overdue_fields.sql'), 'utf8');
    await pool.query(sql);
    console.log('Thành công! Đã thêm: is_overdue + grace_end_time');
    process.exit(0);
  } catch (error) {
    console.error('Lỗi migration:', error.message);
    process.exit(1);
  }
}
runMigration();