// controllers/messageController.js
// API endpoints cho messaging system

const messageService = require('../services/messageService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ===== SEARCH USERS =====
/**
 * GET /api/messages/search?q=query
 * Tìm kiếm users theo tên hoặc email
 */
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const currentUserId = req.session?.user?.user_id || req.session?.userId;
    
    console.log('🔍 Search request - Session:', {
      hasSession: !!req.session,
      sessionUserId: req.session?.userId,
      sessionUser: req.session?.user,
      query: q
    });
    
    if (!currentUserId) {
      console.log('❌ No user ID in session');
      return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
    }
    
    if (!q || q.trim().length === 0) {
      return res.json({ success: true, users: [] });
    }
    
    console.log(`🔍 User ${currentUserId} tìm kiếm: "${q}"`);
    
    const users = await messageService.searchUsers(q.trim(), currentUserId);
    
    res.json({ success: true, users });
  } catch (error) {
    console.error('❌ searchUsers error:', error);
    res.status(500).json({ success: false, message: 'Lỗi tìm kiếm người dùng' });
  }
};

// ===== GET CONVERSATIONS =====
/**
 * GET /api/messages/conversations
 * Lấy danh sách conversations (người đã nhắn tin)
 */
exports.getConversations = async (req, res) => {
  try {
    const userId = req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
    }
    
    const conversations = await messageService.getUserConversations(userId);
    
    res.json({ success: true, conversations });
  } catch (error) {
    console.error('❌ getConversations error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách hội thoại' });
  }
};

// ===== GET MESSAGES =====
/**
 * GET /api/messages/:otherUserId
 * Lấy tin nhắn với user khác
 */
exports.getMessages = async (req, res) => {
  try {
    const userId = req.session?.userId;
    const otherUserId = parseInt(req.params.otherUserId);
    const { before, limit } = req.query;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
    }
    
    if (isNaN(otherUserId)) {
      return res.status(400).json({ success: false, message: 'ID người dùng không hợp lệ' });
    }
    
    const messages = await messageService.getMessages(
      userId, 
      otherUserId, 
      limit ? parseInt(limit) : 50,
      before ? parseInt(before) : null
    );
    
    res.json({ success: true, messages });
  } catch (error) {
    console.error('❌ getMessages error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy tin nhắn' });
  }
};

// ===== SEND MESSAGE =====
/**
 * POST /api/messages/:receiverId
 * Gửi tin nhắn text
 */
exports.sendMessage = async (req, res) => {
  try {
    const senderId = req.session?.userId;
    const receiverId = parseInt(req.params.receiverId);
    const { content } = req.body;
    
    if (!senderId) {
      return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
    }
    
    if (isNaN(receiverId)) {
      return res.status(400).json({ success: false, message: 'ID người nhận không hợp lệ' });
    }
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Nội dung tin nhắn không được rỗng' });
    }
    
    console.log(`📤 User ${senderId} gửi tin nhắn cho user ${receiverId}`);
    
    const message = await messageService.sendMessage(
      senderId,
      receiverId,
      content.trim(),
      'text'
    );
    
    res.json({ success: true, message });
  } catch (error) {
    console.error('❌ sendMessage error:', error);
    res.status(500).json({ success: false, message: 'Lỗi gửi tin nhắn' });
  }
};

// ===== UPLOAD FILE/IMAGE/VIDEO =====
/**
 * POST /api/messages/upload/:receiverId
 * Upload và gửi file/ảnh/video
 */

// Cấu hình multer cho upload files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/messages');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|pdf|doc|docx|xls|xlsx|zip|rar|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Loại file không được hỗ trợ'));
    }
  }
}).single('file');

exports.uploadFile = (req, res) => {
  upload(req, res, async (err) => {
    try {
      if (err) {
        console.error('❌ Upload error:', err);
        return res.status(400).json({ success: false, message: err.message });
      }
      
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Không có file nào được upload' });
      }
      
      const senderId = req.session?.userId;
      const receiverId = parseInt(req.params.receiverId);
      const { caption } = req.body; // Text đi kèm file
      
      if (!senderId) {
        // Xóa file đã upload nếu chưa đăng nhập
        fs.unlinkSync(req.file.path);
        return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
      }
      
      if (isNaN(receiverId)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: 'ID người nhận không hợp lệ' });
      }
      
      // Xác định message_type
      const ext = path.extname(req.file.originalname).toLowerCase();
      let messageType = 'file';
      if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
        messageType = 'image';
      } else if (['.mp4', '.mov', '.avi'].includes(ext)) {
        messageType = 'video';
      }
      
      const attachmentUrl = `/uploads/messages/${req.file.filename}`;
      const content = caption && caption.trim().length > 0 ? caption.trim() : req.file.originalname;
      
      console.log(`📎 User ${senderId} gửi ${messageType} cho user ${receiverId}: ${req.file.originalname}`);
      
      const message = await messageService.sendMessage(
        senderId,
        receiverId,
        content,
        messageType,
        attachmentUrl,
        req.file.originalname,
        req.file.size
      );
      
      res.json({ success: true, message });
    } catch (error) {
      console.error('❌ uploadFile error:', error);
      // Xóa file nếu có lỗi
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ success: false, message: 'Lỗi upload file' });
    }
  });
};

// ===== MARK AS READ =====
/**
 * PUT /api/messages/read/:otherUserId
 * Đánh dấu tin nhắn đã đọc
 */
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.session?.userId;
    const otherUserId = parseInt(req.params.otherUserId);
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
    }
    
    if (isNaN(otherUserId)) {
      return res.status(400).json({ success: false, message: 'ID người dùng không hợp lệ' });
    }
    
    await messageService.markMessagesAsRead(userId, otherUserId);
    
    res.json({ success: true, message: 'Đã đánh dấu đọc' });
  } catch (error) {
    console.error('❌ markAsRead error:', error);
    res.status(500).json({ success: false, message: 'Lỗi đánh dấu tin nhắn' });
  }
};

// ===== GET UNREAD COUNT =====
/**
 * GET /api/messages/unread/count
 * Lấy số tin nhắn chưa đọc
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
    }
    
    const count = await messageService.getUnreadCount(userId);
    
    res.json({ success: true, count });
  } catch (error) {
    console.error('❌ getUnreadCount error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy số tin nhắn chưa đọc' });
  }
};

// ===== DELETE MESSAGE =====
/**
 * DELETE /api/messages/:messageId
 * Xóa tin nhắn (chỉ người gửi)
 */
exports.deleteMessage = async (req, res) => {
  try {
    const userId = req.session?.userId;
    const messageId = parseInt(req.params.messageId);
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
    }
    
    if (isNaN(messageId)) {
      return res.status(400).json({ success: false, message: 'ID tin nhắn không hợp lệ' });
    }
    
    const deletedMessage = await messageService.deleteMessage(messageId, userId);
    
    if (!deletedMessage) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tin nhắn hoặc không có quyền xóa' });
    }
    
    // Xóa file nếu có
    if (deletedMessage.attachment_url) {
      const filePath = path.join(__dirname, '..', deletedMessage.attachment_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    res.json({ success: true, message: 'Đã xóa tin nhắn' });
  } catch (error) {
    console.error('❌ deleteMessage error:', error);
    res.status(500).json({ success: false, message: 'Lỗi xóa tin nhắn' });
  }
};
