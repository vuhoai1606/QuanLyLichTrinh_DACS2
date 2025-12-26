// services/notificationScheduler.js
const pool = require('../config/db');

/**
 * NOTIFICATION SCHEDULER
 * Kiểm tra và emit socket cho các system notifications đã đến thời gian hiển thị
 * Chạy mỗi phút để check notifications cần được push
 */

let schedulerInterval = null;

/**
 * Khởi động scheduler - chạy mỗi phút
 */
function startNotificationScheduler() {
  if (schedulerInterval) {
    console.log('⚠️ Notification scheduler đã chạy rồi');
    return;
  }

  console.log('🚀 Starting notification scheduler...');
  
  // Chạy ngay lần đầu
  checkAndEmitScheduledNotifications();
  
  // Sau đó chạy mỗi phút
  schedulerInterval = setInterval(() => {
    checkAndEmitScheduledNotifications();
  }, 60000); // 60.000ms = 1 phút
  
  console.log('✅ Notification scheduler started (runs every 1 minute)');
}

/**
 * Dừng scheduler
 */
function stopNotificationScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('🛑 Notification scheduler stopped');
  }
}

/**
 * Check và emit notifications đã đến thời gian
 */
async function checkAndEmitScheduledNotifications() {
  try {
    // Tìm system_notifications đã đến thời gian hiển thị
    // Chỉ emit cho users đang ONLINE (những người trong onlineUsers map)
    const query = `
      SELECT 
        sn.notification_id,
        sn.title,
        sn.content,
        sn.created_at,
        sn.start_date,
        sn.target_users
      FROM system_notifications sn
      WHERE sn.is_active = true
        AND sn.start_date <= NOW()
        AND sn.start_date >= NOW() - INTERVAL '2 minutes'
    `;
    
    const result = await pool.query(query);
    const notificationsToEmit = result.rows;
    
    if (notificationsToEmit.length === 0) {
      return; // Không có notification nào cần emit
    }
    
    console.log(`📬 Found ${notificationsToEmit.length} notifications ready to emit`);
    
    // Emit socket cho users ONLINE
    if (!global.io || !global.onlineUsers) {
      console.error('❌ Socket.IO or onlineUsers not available');
      return;
    }
    
    const io = global.io;
    const onlineUserIds = Array.from(global.onlineUsers.keys());
    
    if (onlineUserIds.length === 0) {
      console.log('⚠️ No users online, skipping emission');
      return;
    }
    
    for (const notification of notificationsToEmit) {
      // Lấy danh sách target users
      let targetUserIds = [];
      if (notification.target_users === 'all') {
        targetUserIds = onlineUserIds; // Chỉ emit cho users đang online
      } else {
        try {
          const parsed = JSON.parse(notification.target_users);
          if (Array.isArray(parsed)) {
            // Chỉ emit cho users vừa là target VÀ đang online
            targetUserIds = parsed.filter(id => onlineUserIds.includes(id));
          }
        } catch (err) {
          console.error('Invalid target_users JSON:', notification.target_users);
        }
      }
      
      // Emit socket cho từng user
      targetUserIds.forEach(userId => {
        io.to(`user:${userId}`).emit('notification:new', {
          notification: {
            notification_id: notification.notification_id,
            type: 'system',
            title: notification.title,
            message: notification.content,
            created_at: notification.created_at
          }
        });
      });
      
      console.log(`🔔 Emitted notification "${notification.title}" to ${targetUserIds.length} online users`);
    }
    
  } catch (error) {
    console.error('❌ Error in notification scheduler:', error);
  }
}

module.exports = {
  startNotificationScheduler,
  stopNotificationScheduler,
  checkAndEmitScheduledNotifications
};
