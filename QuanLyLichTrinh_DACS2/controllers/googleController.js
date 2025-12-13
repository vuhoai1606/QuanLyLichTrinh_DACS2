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
exports.handleGoogleCallback = async (req, res) => {
    const code = req.query.code;
    const userId = req.query.state; // Lấy userId từ state
    
    if (!code || !userId) {
        return res.redirect('/settings?error=google_auth_failed');
    }
    
    try {
        // Lấy tokens (access_token, refresh_token)
        const { tokens } = await oauth2Client.getToken(code);
        
        if (!tokens.refresh_token) {
            // Xử lý nếu Google không trả về refresh token (do user chưa đồng ý lần đầu)
            console.warn('Google không trả về refresh token. Yêu cầu user cấp quyền lại.');
            return res.redirect('/settings?error=google_no_refresh_token');
        }

        // Lưu tokens và thiết lập Webhook
        await setupSync(userId, tokens); 
        
        // Cập nhật session (để frontend biết đã login)
        req.session.googleToken = true; 
        req.session.userId = userId; 
        req.session.googleToken = true;
        
        console.log(`[Google Controller] OAuth thành công và lưu tokens cho User: ${userId}`);
        
        // Chuyển hướng người dùng về trang cài đặt hoặc dashboard
        return res.redirect('/settings?success=google_sync_setup');

    } catch (error) {
        console.error('Lỗi Google Callback:', error);
        return res.redirect('/settings?error=google_token_error');
    }
};

/**
 * Xử lý thông báo Webhook từ Google (Real-time)
 */
exports.handleWebhookNotification = async (req, res) => {
    // 1. Kiểm tra header Google gửi đến
    const channelId = req.header('X-Goog-Channel-Id');
    const resourceState = req.header('X-Goog-Resource-State');
    
    console.log(`\n🔔 [Google Controller]: Webhook nhận được (ID: ${channelId}, Trạng thái: ${resourceState})`);

    // Phải trả về 204 ngay lập tức
    res.status(204).send(); 
    
    if (resourceState === 'exists') {
        // 1. Xác định người dùng bằng channelId
        // const user = await findUserByChannelId(channelId); // Cần tạo hàm này trong DB

        // 2. Lấy access token mới dùng refresh token
        // const newAccessToken = await refreshAccessToken(user.google_refresh_token); 

        // 3. Kéo (fetch) dữ liệu mới nhất từ Google Calendar API
        // const updatedEvents = await fetchAndSaveLatestEvents(user.userId, newAccessToken);

        // 4. Dùng Socket.IO để thông báo Real-time cho người dùng đó
        // global.io.to(user.userId).emit('calendarUpdate', { events: updatedEvents });
        console.log(`   [Google Controller]: Kích hoạt cập nhật Real-time cho client.`);

    } else if (resourceState === 'stop') {
        console.log(`   [Google Controller]: Kênh Webhook đã dừng (Channel ID: ${channelId}).`);
    }
};