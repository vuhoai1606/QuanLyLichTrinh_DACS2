// migrations/run_add_calendar_invitations_table.js
const db = require('../config/db'); // Import toàn bộ object

async function up() {
  try {
    const { pool } = db; // Lấy pool từ object đã export
    if (!pool) {
      throw new Error('Pool không được khởi tạo. Kiểm tra config/db.js');
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS calendar_invitations (
        invitation_id SERIAL PRIMARY KEY,
        token VARCHAR(64) UNIQUE NOT NULL,
        sender_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        invite_email VARCHAR(255) NOT NULL,
        permissions VARCHAR(20) NOT NULL DEFAULT 'view' CHECK (permissions IN ('view', 'edit')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        accepted_at TIMESTAMP WITH TIME ZONE NULL,
        accepted_by INTEGER NULL REFERENCES users(user_id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_calendar_invitations_token ON calendar_invitations(token);
      CREATE INDEX IF NOT EXISTS idx_calendar_invitations_email ON calendar_invitations(invite_email);
      CREATE INDEX IF NOT EXISTS idx_calendar_invitations_created_at ON calendar_invitations(created_at);
    `);

    console.log('✅ Migration calendar_invitations table completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

up();