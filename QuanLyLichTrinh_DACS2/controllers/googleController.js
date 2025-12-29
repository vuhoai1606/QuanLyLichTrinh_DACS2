// controllers/googleController.js
// GIẢ LẬP: Modules Google API và Database

const pool = require('../config/db'); // Dùng DB pool của bạn
const { google } = require('googleapis');

// Các biến môi trường cần thiết (cần đặt trong file .env của bạn)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '1006999241826-k0jo6r2hd4qplanogp5bcpd16rte3ufj.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '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';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8888/api/google/callback/';

const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
);

// MOCK FUNCTION: Lấy thông tin người dùng từ DB (chỉ dùng ID)
async function findUserById(userId) {
    try {
        const result = await pool.query('SELECT user_id, google_refresh_token, google_channel_id FROM users WHERE user_id = $1', [userId]);
        return result.rows[0];
    } catch (error) {
        console.error('Lỗi DB khi tìm user:', error);
        return null;
    }
}

// MOCK FUNCTION: Lưu tokens và thiết lập Webhook
async function setupSync(userId, tokens) {
    const { refresh_token, access_token } = tokens;
    
    // GIẢ LẬP DB: Giả định DB update thành công
    // Nếu bạn muốn test luồng, bạn cần một nơi để lưu tokens tạm thời (ví dụ: một Map hoặc một biến global)
    // Vì đây là controller, tôi sẽ giả định DB update thành công.
    
    // 1. Lưu Tokens vào DB
    // await pool.query('UPDATE users SET google_refresh_token = $1, google_access_token = $2 WHERE user_id = $3', [refresh_token, access_token, userId]);
    
    // ... (logic webhook)
    
    console.log(`[Google Controller] Thiết lập Webhook thành công cho User: ${userId}`);
    return { message: 'Đã lưu tokens và thiết lập Webhook thành công.' };
}

// ===================================================================
// HANDLERS
// ===================================================================

/**
 * Xử lý yêu cầu Sync từ nút Frontend
 */
exports.handleSyncRequest = async (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
        // Không nên xảy ra do protectMock, nhưng là một kiểm tra an toàn
        return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập.' });
    }
    
    const user = await findUserById(userId);

    if (user && user.google_refresh_token) {
        // Đã có token, thực hiện đồng bộ hóa thủ công/kiểm tra Webhook
        console.log(`[Google Controller] User ${userId} đã có token. Kích hoạt Manual Sync.`);
        
        try {
            // Logic Real: Lấy Access Token mới dùng Refresh Token
            // const newAccessToken = await refreshAccessToken(user.google_refresh_token); 
            
            // Logic Real: Thực hiện Manual Sync (kéo/đẩy dữ liệu)
            // await manualSyncLogic(userId, newAccessToken);
            
            await new Promise(resolve => setTimeout(resolve, 1500)); // Giả lập xử lý
            
            return res.status(200).json({ 
                success: true, 
                message: 'Đồng bộ hóa thủ công thành công.' 
            });

        } catch (error) {
            console.error('Lỗi Manual Sync:', error);
            // Xóa token cũ nếu lỗi do Token hết hạn
            // await pool.query('UPDATE users SET google_refresh_token = NULL WHERE user_id = $1', [userId]);
            return res.status(500).json({ 
                success: false, 
                message: 'Token Google hết hạn hoặc lỗi đồng bộ. Vui lòng xác thực lại.' 
            });
        }

    } else {
        // Chưa có token, cần OAuth
        const scope = [
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/calendar.readonly'
        ];

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline', // Cần refresh token
            scope: scope,
            state: userId, // Lưu userId để xác định khi Google gọi lại
            prompt: 'consent'
        });

        return res.status(200).json({ 
            success: true, 
            action: 'redirect', 
            url: authUrl 
        });
    }
};

/**
 * Xử lý callback sau khi người dùng cấp quyền
 */
// controllers/googleController.js
exports.handleGoogleCallback = async (req, res) => {
  const { code, state } = req.query;

  let userId;
  try {
    const parsedState = JSON.parse(state || '{}');
    userId = parsedState.userId;
  } catch (err) {
    console.error('Invalid state format:', err);
    return res.redirect('/calendar?google_sync=error');
  }

  if (!code || !userId) {
    return res.redirect('/calendar?google_sync=error');
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Lưu vào bảng users (giữ refresh_token cũ nếu đã có)
    await pool.query(`
      UPDATE users SET
        google_access_token = $1,
        google_refresh_token = COALESCE(google_refresh_token, $2),
        google_calendar_id = 'primary'
      WHERE user_id = $3
    `, [tokens.access_token, tokens.refresh_token, userId]);

    // Tạo watch channel + full sync ngay lập tức
    await createOrRenewWatchChannel(userId);
    await performFullSync(userId);

    console.log(`[Google Sync] Thành công cho user ${userId}`);

    // Redirect về calendar với thông báo thành công
    res.redirect('/calendar?google_sync=success');
  } catch (error) {
    console.error('Lỗi Google OAuth Callback:', error);
    res.redirect('/calendar?google_sync=error');
  }
};

/**
 * Xử lý thông báo Webhook từ Google (Real-time)
 */
// controllers/googleController.js

exports.handleWebhookNotification = async (req, res) => {
  // ==================== 1. LOG & VALIDATION CƠ BẢN ====================
  const channelId = req.headers['x-goog-channel-id'];
  const resourceState = req.headers['x-goog-resource-state'];
  const resourceId = req.headers['x-goog-resource-id'];
  const channelToken = req.headers['x-goog-channel-token']; // Nên có token để validate

  console.log(`\n🔔 [WEBHOOK] Nhận từ Google`);
  console.log(`   Channel ID: ${channelId}`);
  console.log(`   Resource State: ${resourceState}`);
  console.log(`   Resource ID: ${resourceId}`);
  console.log(`   Token: ${channelToken}`);

  // ==================== 2. TRẢ VỀ NGAY ĐỂ GOOGLE KHÔNG GỬI LẠI ====================
  // Google yêu cầu status 2xx (200 hoặc 204). 200 phổ biến hơn.
  res.status(200).send('OK');

  // Nếu chỉ là sync message hoặc channel stop → không cần xử lý thêm
  if (resourceState === 'sync') {
    console.log('   → Sync message (initial handshake) - bỏ qua.');
    return;
  }

  if (resourceState !== 'exists') {
    console.log(`   → Resource state: ${resourceState} - không xử lý.`);
    return;
  }

  // ==================== 3. TÌM USER THEO CHANNEL ID ====================
  let user;
  try {
    const result = await pool.query(
      'SELECT user_id, google_access_token, google_refresh_token, google_sync_token FROM users WHERE google_channel_id = $1',
      [channelId]
    );
    user = result.rows[0];
  } catch (err) {
    console.error('❌ Lỗi query user từ channel_id:', err);
    return;
  }

  if (!user) {
    console.warn(`   ⚠️ Không tìm thấy user với channel_id: ${channelId}`);
    return;
  }

  console.log(`   ✅ Tìm thấy user: ${user.user_id}`);

  // ==================== 4. THỰC HIỆN INCREMENTAL SYNC ====================
  try {
    await performIncrementalSync(user.user_id);
    console.log(`   🎉 Đồng bộ thành công cho user ${user.user_id}`);
  } catch (err) {
    console.error(`❌ Lỗi khi đồng bộ calendar cho user ${user.user_id}:`, err);
    // Có thể thêm logic retry hoặc thông báo admin ở đây
  }
};

async function createOrRenewWatchChannel(userId) {
  const { rows: [user] } = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
  if (!user.google_refresh_token) return;

  const oauth2Client = getOAuth2Client(user); // Hàm helper set credentials + auto refresh
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const channelId = `channel-user-${userId}-${Date.now()}`;

  const watchRes = await calendar.events.watch({
    calendarId: user.google_calendar_id || 'primary',
    requestBody: {
      id: channelId,
      type: 'web_hook',
      address: 'https://yourdomain.com/api/google/webhook',
      token: `user_${userId}` // Để validate webhook
    }
  });

  await pool.query(`
    UPDATE users SET
      google_channel_id = $1,
      google_channel_expiration = $2,
      google_sync_token = NULL
    WHERE user_id = $3
  `, [channelId, watchRes.data.expiration, userId]);
}