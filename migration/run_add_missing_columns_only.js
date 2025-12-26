const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Cấu hình database từ .env
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function runMigration() {
    const client = await pool.connect();
    
    try {
        console.log('🚀 Starting migration: add_missing_columns_only.sql');
        console.log('📋 Thêm các cột thiếu vào CSDL...\n');
        
        // Đọc file SQL
        const sqlFile = path.join(__dirname, 'add_missing_columns_only.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');
        
        // Chạy migration
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        
        console.log('\n✅ Migration completed successfully!');
        console.log('\n📊 Các thay đổi đã thực hiện:');
        
        console.log('\n1️⃣ BẢNG EVENTS:');
        console.log('   ✅ Thêm cột: location (TEXT)');
        console.log('   ✅ Đảm bảo có: calendar_type (VARCHAR 50)');
        
        console.log('\n2️⃣ BẢNG NOTIFICATIONS:');
        console.log('   ✅ Thêm cột: redirect_url (TEXT)');
        console.log('   ✅ Thêm cột: related_id (INTEGER)');
        
        console.log('\n3️⃣ STATUS_ENUM:');
        console.log('   ✅ Thêm giá trị: \'overdue\' (quá hạn)');
        
        console.log('\n✨ Không thay đổi:');
        console.log('   ℹ️ Bảng users (giữ nguyên is_banned, ban_date, ban_reason)');
        console.log('   ℹ️ Indexes (không xóa gì)');
        console.log('   ℹ️ Constraints (không xóa gì)');
        
        console.log('\n🎉 CSDL đã được cập nhật với các cột thiếu!\n');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Migration failed:', error.message);
        console.error('📝 Chi tiết lỗi:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
