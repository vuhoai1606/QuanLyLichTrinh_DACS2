// config/googleSyncScheduler.js
const cron = require('node-cron');
const pool = require('./db'); // config/db.js
const { createOrRenewWatchChannel } = require('../controllers/googleController');

function startGoogleSyncScheduler() {
  console.log('🚀 Google Calendar Watch Channel Scheduler khởi động (chạy hàng ngày lúc 00:00)');

  cron.schedule('0 0 * * *', async () => {
    console.log('[Cron] Đang kiểm tra và renew Google watch channels...');

    try {
      const { rows } = await pool.query(`
        SELECT user_id FROM users
        WHERE google_channel_expiration IS NOT NULL
          AND google_channel_expiration < $1
      `, [Date.now() + 172800000]); // 2 ngày trước khi expire

      console.log(`[Cron] Có ${rows.length} user cần renew channel`);

      for (const { user_id } of rows) {
        try {
          await createOrRenewWatchChannel(user_id);
          console.log(`[Cron] Renew thành công cho user ${user_id}`);
        } catch (err) {
          console.error(`[Cron] Lỗi renew cho user ${user_id}:`, err);
        }
      }
    } catch (err) {
      console.error('[Cron] Lỗi khi truy vấn users:', err);
    }
  });
}

module.exports = { startGoogleSyncScheduler };