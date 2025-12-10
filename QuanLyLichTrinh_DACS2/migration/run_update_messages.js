// migration/run_update_messages.js
// Chạy migration update_messages_table.sql

const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('📊 Bắt đầu migration: update_messages_table.sql...');
    
    const sqlPath = path.join(__dirname, 'update_messages_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    
    console.log('✅ Migration hoàn thành thành công!');
    console.log('📋 Đã thêm:');
    console.log('   - message_type ENUM (text, image, file, video)');
    console.log('   - file_name, file_size columns');
    console.log('   - conversations table');
    console.log('   - Triggers và indexes tối ưu');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration thất bại:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
