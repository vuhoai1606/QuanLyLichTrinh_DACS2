// Migration: Tạo bảng user_sessions cho PostgreSQL Session Store
require('dotenv').config();
const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🔄 Bắt đầu migration: Tạo bảng user_sessions...');
    
    const sql = fs.readFileSync(
      path.join(__dirname, 'create_user_sessions_table.sql'),
      'utf8'
    );
    
    await pool.query(sql);
    
    console.log('✅ Migration thành công! Bảng user_sessions đã được tạo.');
    
    // Verify
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_sessions'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Cấu trúc bảng:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration thất bại:', error.message);
    process.exit(1);
  }
}

runMigration();
