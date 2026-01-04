const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    console.log('🚀 Bắt đầu migration: Thêm Calendar Invitations và Google Calendar Integration...');
    
    try {
        const sqlPath = path.join(__dirname, 'add_new_features_calendar_invitations.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        await pool.query(sql);
        
        console.log('✅ Migration thành công!');
        console.log('\n📋 Các thay đổi đã được áp dụng:');
        console.log('  ✓ Tạo bảng calendar_invitations');
        console.log('  ✓ Thêm 6 cột vào bảng events (Google Calendar Integration)');
        console.log('  ✓ Thêm 1 cột vào bảng tasks (category_id)');
        console.log('  ✓ Thêm 8 cột vào bảng users (Google OAuth & 2FA)');
        console.log('  ✓ Thêm 1 cột vào bảng system_notifications (end_date)');
        console.log('  ✓ Tạo các indexes mới');
        console.log('  ✓ Cập nhật constraints');
        
        // Verification
        console.log('\n🔍 Kiểm tra kết quả migration...');
        
        // Check calendar_invitations table
        const checkTable = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'calendar_invitations'
            );
        `);
        console.log(`  ✓ Bảng calendar_invitations: ${checkTable.rows[0].exists ? 'Đã tạo' : 'Chưa tạo'}`);
        
        // Check events columns
        const checkEventsColumns = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'events' 
            AND column_name IN ('google_event_id', 'google_etag', 'recurrence', 'recurring_event_id', 'is_recurring_instance', 'original_start_time')
            ORDER BY column_name;
        `);
        console.log(`  ✓ Cột mới trong events: ${checkEventsColumns.rows.length}/6 cột`);
        
        // Check tasks columns
        const checkTasksColumns = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'tasks' 
            AND column_name = 'category_id';
        `);
        console.log(`  ✓ Cột category_id trong tasks: ${checkTasksColumns.rows.length > 0 ? 'Đã thêm' : 'Chưa thêm'}`);
        
        // Check users columns
        const checkUsersColumns = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name IN ('google_access_token', 'google_refresh_token', 'google_calendar_id', 'google_channel_id', 'google_channel_expiration', 'totp_secret', 'google_sync_token', 'last_google_sync_at')
            ORDER BY column_name;
        `);
        console.log(`  ✓ Cột mới trong users: ${checkUsersColumns.rows.length}/8 cột`);
        
        // Check system_notifications columns
        const checkNotifColumns = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'system_notifications' 
            AND column_name = 'end_date';
        `);
        console.log(`  ✓ Cột end_date trong system_notifications: ${checkNotifColumns.rows.length > 0 ? 'Đã thêm' : 'Chưa thêm'}`);
        
        console.log('\n✨ Migration hoàn tất thành công!');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Lỗi khi chạy migration:', error.message);
        console.error('\n📝 Chi tiết lỗi:', error);
        process.exit(1);
    }
}

runMigration();
