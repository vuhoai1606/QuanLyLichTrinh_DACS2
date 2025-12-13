// migration/run_add_google.js

const fs = require('fs');
const path = require('path');

// Giả định pool được import từ config/db.js. 
// Trong môi trường migration thực tế, bạn thường cần cấu hình lại pool ở đây.
// Vì đây là file độc lập, ta cần giả định pool đã có. 
// Nếu bạn có một cấu trúc migration framework, nó sẽ cung cấp pool.
// Ở đây tôi sẽ giả định Pool được truyền vào hoặc import.

const pool = require('../config/db'); // Thay thế bằng đường dẫn import pool chính xác của bạn

const MIGRATION_NAME = 'add_google_fields';

/**
 * Hàm thực thi migration UP (Thêm các cột mới)
 * @param {object} client - Đối tượng client hoặc pool từ node-postgres
 */
async function up(client) {
    const sqlPath = path.join(__dirname, 'add_google.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log(`[Migration] Bắt đầu chạy migration UP: ${MIGRATION_NAME}`);
    console.log('--- Thực thi SQL ---');
    console.log(sql.trim());
    console.log('-------------------');

    try {
        await client.query(sql);
        console.log(`[Migration] Thành công: Đã thêm các trường Google vào users và events.`);
    } catch (error) {
        console.error(`[Migration] LỖI khi chạy UP migration ${MIGRATION_NAME}:`, error);
        throw error;
    }
}

/**
 * Hàm thực thi migration DOWN (Hoàn tác - Xóa các cột đã thêm)
 * Lưu ý: Luôn cần hàm down để rollback khi cần thiết!
 * @param {object} client - Đối tượng client hoặc pool từ node-postgres
 */
async function down(client) {
    const rollbackSql = `
        -- Xóa cột từ bảng events
        ALTER TABLE events
            DROP COLUMN IF EXISTS google_event_id,
            DROP COLUMN IF EXISTS google_etag;

        -- Xóa cột từ bảng users
        ALTER TABLE users
            DROP COLUMN IF EXISTS google_access_token,
            DROP COLUMN IF EXISTS google_refresh_token,
            DROP COLUMN IF EXISTS google_calendar_id,
            DROP COLUMN IF EXISTS google_channel_id,
            DROP COLUMN IF EXISTS google_channel_expiration;
    `;

    console.log(`[Migration] Bắt đầu chạy migration DOWN: ${MIGRATION_NAME}`);
    
    try {
        await client.query(rollbackSql);
        console.log(`[Migration] Thành công: Đã xóa các trường Google khỏi users và events.`);
    } catch (error) {
        console.error(`[Migration] LỖI khi chạy DOWN migration ${MIGRATION_NAME}:`, error);
        throw error;
    }
}


/**
 * Hàm chính để chạy migration khi gọi trực tiếp
 */
async function runMigration() {
    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN'); // Bắt đầu transaction

        // Thường thì một migration framework sẽ quản lý việc này. 
        // Ở đây ta gọi trực tiếp hàm up()
        await up(client); 
        
        await client.query('COMMIT'); // Commit transaction
        console.log(`[Migration] Hoàn thành migration ${MIGRATION_NAME} thành công.`);

    } catch (error) {
        if (client) {
            await client.query('ROLLBACK'); // Rollback nếu có lỗi
            console.error(`[Migration] Đã rollback migration ${MIGRATION_NAME} do lỗi.`);
        }
        process.exit(1); // Thoát với mã lỗi
    } finally {
        if (client) client.release();
    }
}

// Nếu file này được chạy trực tiếp bằng node (ví dụ: node migration/run_add_google.js)
if (require.main === module) {
    runMigration();
}

// Export các hàm UP/DOWN để sử dụng trong migration framework chính của bạn
module.exports = {
    up,
    down,
    name: MIGRATION_NAME
};

/*npm install googleapis*/