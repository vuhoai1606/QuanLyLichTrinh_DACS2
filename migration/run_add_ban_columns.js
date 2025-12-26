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
        console.log('🚀 Starting migration: add_ban_columns.sql');
        
        // Đọc file SQL
        const sqlFile = path.join(__dirname, 'add_ban_columns.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');
        
        // Chạy migration
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        
        console.log('✅ Migration completed successfully!');
        console.log('📊 Columns added to users table:');
        console.log('   - is_banned (BOOLEAN)');
        console.log('   - ban_reason (TEXT)');
        console.log('   - ban_date (TIMESTAMP)');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
