// routes/calendarRoutes.js

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const eventService = require('../services/eventService'); 
const { requireAuth } = require('../middleware/authMiddleware');
const nodemailer = require('nodemailer'); // Cần thư viện nodemailer

// === CẤU HÌNH SMTP CỦA BẠN (QUAN TRỌNG) ===
let transporter = nodemailer.createTransport({
    // Cấu hình cho Gmail
    service: 'gmail', 
    auth: {
        // ĐỊA CHỈ EMAIL GỬI (Đã xác nhận từ bạn)
        user: "tien.dinhcong2006@gmail.com", 
        // ✨ DÁN MẬT KHẨU ỨNG DỤNG ĐÃ TẠO VÀO ĐÂY (NHỚ XÓA CÁC KHOẢNG TRẮNG) ✨
        pass: "aezuijnizfpbvaic" 
    }
});
// ============================================

// === TẤT CẢ ROUTES ĐỀU YÊU CẦU ĐĂNG NHẬP ===
router.use(requireAuth);

// API lấy cả Task + Event trong khoảng thời gian
router.get('/items', async (req, res) => {
  try {
    const userId = req.session.userId;
    const { start, end, group } = req.query; 

    if (!start || !end) {
      return res.status(400).json({ success: false, message: 'Thiếu tham số start hoặc end' });
    }

    const items = await eventService.getAllItemsByDateRange(userId, start, end, group); 

    res.json({ success: true, data: items });

  } catch (error) {
    console.error('Error fetching calendar items:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy dữ liệu lịch', error: error.message });
  }
});

// API Insights
router.get('/insights', async (req, res) => {
  try {
    const userId = req.session.userId;
    // ... (Logic tính toán Insights đã được xác nhận đúng) ...
    
    // TÍNH TOÁN TỔNG GIỜ HỌP TUẦN NÀY (Giữ nguyên)
    const today = new Date();
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay(); 
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(today.getDate() + diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const eventsResult = await pool.query(`
      SELECT COALESCE(SUM(
        EXTRACT(EPOCH FROM (
          COALESCE(end_time, start_time + INTERVAL '1 hour') - start_time
        )) / 3600
      ), 0) AS total_hours
      FROM events 
      WHERE user_id = $1 AND start_time >= $2 AND start_time < $3
    `, [userId, startOfWeek, endOfWeek]);

    const weekly_meetings_hours = Number(parseFloat(eventsResult.rows[0].total_hours).toFixed(1));

    // TÍNH TOÁN GIỜ TRỐNG NGÀY MAI (Giữ nguyên)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const workStart = new Date(tomorrow);
    workStart.setHours(8, 0, 0, 0); 

    const workEnd = new Date(tomorrow);
    workEnd.setHours(18, 0, 0, 0);    

    const busyResult = await pool.query(`
      SELECT COALESCE(SUM(
        EXTRACT(EPOCH FROM (
          LEAST(COALESCE(end_time, start_time + INTERVAL '1 hour'), $3) - 
          GREATEST(start_time, $2)
        )) / 3600
      ), 0) AS busy_hours
      FROM (
        SELECT start_time, end_time FROM events WHERE user_id = $1 AND start_time < $3 AND (end_time IS NULL OR end_time > $2)
        UNION ALL
        SELECT start_time, end_time FROM tasks WHERE user_id = $1 AND start_time IS NOT NULL AND start_time < $3 AND (end_time IS NULL OR end_time > $2)
      ) AS all_items
    `, [userId, workStart, workEnd]);

    const busyHours = parseFloat(busyResult.rows[0].busy_hours);
    const tomorrow_free_hours = Number(Math.max(0, (10 - busyHours).toFixed(1))); 
    
    res.json({
      success: true,
      insights: { weekly_meetings_hours, tomorrow_free_hours }
    });

  } catch (error) {
    console.error('Lỗi tính Insights:', error);
    res.status(500).json({ success: false, message: 'Không thể tính insights', error: error.message });
  }
});

// THÊM HÀM HELPER TÌM USER ID TỪ EMAIL
async function getUserIdByEmail(email) {
    // Giả định bảng users có cột email
    const result = await pool.query('SELECT user_id FROM users WHERE email = $1', [email]);
    return result.rows.length > 0 ? result.rows[0].user_id : null;
}

// Hàm này sẽ được gọi khi lời mời được gửi và người nhận tồn tại trong DB
async function insertShareRecord(eventId, senderId, receiverId, permission) {
    
    // Giả sử EVENT_ID_TO_SHARE là ID của event đầu tiên của người gửi
    const firstEventResult = await pool.query('SELECT event_id FROM events WHERE user_id = $1 LIMIT 1', [senderId]);
    const eventIdToShare = firstEventResult.rows.length > 0 ? firstEventResult.rows[0].event_id : null;
    
    if (!eventIdToShare) {
        console.warn(`User ${senderId} has no events to share.`);
        return false;
    }

    const shareType = 'share'; // Hoặc 'event'
    const query = `
        INSERT INTO shared_events (event_id, owner_id, shared_with_user_id, share_type, permission)
        VALUES ($1, $2, $3, $4, $5) 
        ON CONFLICT (event_id, shared_with_user_id) DO NOTHING
        RETURNING *
    `;

    await pool.query(query, [
        eventIdToShare,
        senderId,
        receiverId,
        shareType,
        permission
    ]);
    return true;
}

// API tạo link chia sẻ 
router.post('/share-link', async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // Tạo uniqueToken bằng Buffer và Base64
    const sourceData = `${userId}${Date.now()}`; 
    const uniqueToken = Buffer.from(sourceData).toString('base64').slice(0, 16); 
    
    const shareUrl = `${req.protocol}://${req.get('host')}/calendar/share/${uniqueToken}`;

    res.json({ success: true, message: 'Link chia sẻ đã được tạo', shareUrl: shareUrl });
  } catch (error) {
    console.error('Lỗi tạo link chia sẻ:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi tạo link' });
  }
});

// API gửi lời mời qua email 
router.post('/share-invite', async (req, res) => {
  const { invite_email, permissions } = req.body; 
  const userId = req.session.userId; // Người gửi 
  
  // Lấy địa chỉ email người gửi từ cấu hình transporter
  const senderEmail = transporter.options.auth.user; 
  
  if (!invite_email || !permissions) {
    return res.status(400).json({ success: false, message: 'Thiếu email hoặc quyền truy cập' });
  }

  if (!invite_email.includes('@')) {
     return res.status(400).json({ success: false, message: 'Địa chỉ email không hợp lệ' });
  }

  // 1. TÌM USER ID CỦA NGƯỜI NHẬN
  const receiverId = await getUserIdByEmail(invite_email);

  // 2. GHI NHẬN CHIA SẺ NẾU USER TỒN TẠI VÀ CÓ EVENTS
  if (receiverId) {
      // Vì bạn chia sẻ TOÀN BỘ lịch, ta cần lấy TẤT CẢ event_id của người gửi (userId)
      const senderEvents = await pool.query('SELECT event_id FROM events WHERE user_id = $1', [userId]);

      if (senderEvents.rows.length > 0) {
          // INSERT hàng loạt bản ghi chia sẻ
          const shareRecords = senderEvents.rows.map(event => [
              event.event_id,
              userId,
              receiverId,
              'shared', 
              permissions 
          ]);

          // Xây dựng truy vấn INSERT đa dòng (để tránh lỗi xung đột, dùng ON CONFLICT DO NOTHING)
          const insertQuery = `
              INSERT INTO shared_events (event_id, owner_id, shared_with_user_id, share_type, permission)
              VALUES ${shareRecords.map((_, index) => `($${index * 5 + 1}, $${index * 5 + 2}, $${index * 5 + 3}, $${index * 5 + 4}, $${index * 5 + 5})`).join(', ')}
              ON CONFLICT (event_id, shared_with_user_id) DO UPDATE SET permission = EXCLUDED.permission;
          `;
          
          const flatParams = shareRecords.flat();
          await pool.query(insertQuery, flatParams);
          
          console.log(`Shared ${senderEvents.rows.length} events from user ${userId} to receiver ${receiverId}.`);
      }
  }
 
  // 3. Gửi mail
  try {
    // Logic tạo token và gửi mail
    const token = Buffer.from(`${userId}${invite_email}${Date.now()}`).toString('base64');
    const invitationLink = `${req.protocol}://${req.get('host')}/invite/accept?token=${token}`;

    let info = await transporter.sendMail({
      from: `"Task Manager (Hệ thống)" <${senderEmail}>`,
      to: invite_email,
      subject: `Lời mời xem Lịch ${permissions} từ User ${userId}`,
      html: `
        <p>Bạn nhận được lời mời tham gia lịch với quyền **${permissions}**.</p>
        <p>Click vào link sau để chấp nhận lời mời: <a href="${invitationLink}">${invitationLink}</a></p>
        ${receiverId ? `<p>Bạn đã có tài khoản, lịch sẽ hiển thị sau khi đăng nhập.</p>` : `<p>Vui lòng đăng ký bằng email này để xem lịch.</p>`}
      `,
    });
    
    res.json({
        success: true,
        message: `Đã gửi lời mời ${permissions} thành công đến ${invite_email}. (Mail ID: ${info.messageId})`
    });

  } catch (error) {
    console.error("Lỗi gửi email:", error);
    res.status(500).json({ 
        success: false, 
        message: `Không thể gửi email. Vui lòng kiểm tra cấu hình SMTP. Lỗi: ${error.message}`
    });
  }
});

module.exports = router;