const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function runMigration() {
  try {
    console.log('📦 Starting migration: add_missing_features...');

    // Đọc file SQL
    const sqlPath = path.join(__dirname, 'add_missing_features.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Thực thi migration
    await pool.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('   - Created table: sprints');
    console.log('   - Added column: tasks.calendar_type');
    console.log('   - Added column: users.role');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
