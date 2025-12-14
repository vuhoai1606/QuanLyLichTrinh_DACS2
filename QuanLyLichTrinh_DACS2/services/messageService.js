// services/messageService.js
// Business logic cho hệ thống messaging

const pool = require('../config/db');

/**
 * Tìm kiếm users theo tên hoặc email
 */
async function searchUsers(query, currentUserId) {
  const searchPattern = `%${query}%`;
  
  const result = await pool.query(`
    SELECT 
      user_id,
      username,
      full_name,
      email,
      avatar_url
    FROM users
    WHERE 
      user_id != $1
      AND (
        full_name ILIKE $2
        OR email ILIKE $2
        OR username ILIKE $2
      )
    ORDER BY 
      CASE 
        WHEN email ILIKE $2 THEN 1
        WHEN full_name ILIKE $2 THEN 2
        ELSE 3
      END,
      full_name ASC
    LIMIT 20
  `, [currentUserId, searchPattern]);
  
  return result.rows;
}

/**
 * Lấy danh sách conversations của user (người đã nhắn tin)
 */
async function getUserConversations(userId) {
  const result = await pool.query(`
    SELECT 
      c.conversation_id,
      c.last_message_at,
      c.updated_at,
      CASE 
        WHEN c.user1_id = $1 THEN c.user2_id
        ELSE c.user1_id
      END AS other_user_id,
      CASE 
        WHEN c.user1_id = $1 THEN u2.full_name
        ELSE u1.full_name
      END AS other_user_name,
      CASE 
        WHEN c.user1_id = $1 THEN u2.username
        ELSE u1.username
      END AS other_username,
      CASE 
        WHEN c.user1_id = $1 THEN u2.email
        ELSE u1.email
      END AS other_email,
      CASE 
        WHEN c.user1_id = $1 THEN u2.avatar_url
        ELSE u1.avatar_url
      END AS other_avatar,
      CASE 
        WHEN c.user1_id = $1 THEN c.unread_count_user1
        ELSE c.unread_count_user2
      END AS unread_count,
      m.message_content AS last_message,
      m.message_type AS last_message_type,
      m.sender_id AS last_sender_id
    FROM conversations c
    LEFT JOIN users u1 ON c.user1_id = u1.user_id
    LEFT JOIN users u2 ON c.user2_id = u2.user_id
    LEFT JOIN messages m ON c.last_message_id = m.message_id
    WHERE c.user1_id = $1 OR c.user2_id = $1
    ORDER BY c.last_message_at DESC
  `, [userId]);
  
  return result.rows;
}

/**
 * Lấy tin nhắn giữa 2 users
 */
async function getMessages(userId, otherUserId, limit = 50, beforeMessageId = null) {
  let query = `
    SELECT 
      m.message_id,
      m.sender_id,
      m.receiver_id,
      m.message_content,
      m.message_type,
      m.attachment_url,
      m.file_name,
      m.file_size,
      m.is_read,
      m.sent_at,
      u.full_name AS sender_name,
      u.username AS sender_username,
      u.avatar_url AS sender_avatar
    FROM messages m
    JOIN users u ON m.sender_id = u.user_id
    WHERE 
      (m.sender_id = $1 AND m.receiver_id = $2)
      OR (m.sender_id = $2 AND m.receiver_id = $1)
  `;
  
  const params = [userId, otherUserId];
  
  if (beforeMessageId) {
    query += ` AND m.message_id < $${params.length + 1}`;
    params.push(beforeMessageId);
  }
  
  query += ` ORDER BY m.sent_at DESC LIMIT $${params.length + 1}`;
  params.push(limit);
  
  const result = await pool.query(query, params);
  
  // Đánh dấu tin nhắn đã đọc
  await markMessagesAsRead(userId, otherUserId);
  
  return result.rows.reverse(); // Đảo ngược để tin nhắn cũ lên trên
}

/**
 * Gửi tin nhắn
 */
async function sendMessage(senderId, receiverId, content, messageType = 'text', attachmentUrl = null, fileName = null, fileSize = null) {
  const result = await pool.query(`
    INSERT INTO messages (
      sender_id, 
      receiver_id, 
      message_content, 
      message_type,
      attachment_url,
      file_name,
      file_size
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING message_id, sender_id, receiver_id, message_content, message_type, attachment_url, file_name, file_size, sent_at, is_read
  `, [senderId, receiverId, content, messageType, attachmentUrl, fileName, fileSize]);
  
  const message = result.rows[0];
  
  // Lấy thông tin sender để trả về đầy đủ (cho Socket.IO và frontend)
  const senderInfo = await pool.query(
    'SELECT user_id, username, full_name, avatar_url FROM users WHERE user_id = $1',
    [senderId]
  );
  
  // Gộp thông tin
  return {
    ...message,
    sender_name: senderInfo.rows[0].full_name,
    sender_avatar: senderInfo.rows[0].avatar_url,
  };
}

/**
 * Đánh dấu tin nhắn đã đọc
 */
async function markMessagesAsRead(userId, otherUserId) {
  await pool.query('SELECT mark_messages_as_read($1, $2)', [userId, otherUserId]);
}

/**
 * Lấy số lượng tin nhắn chưa đọc
 */
async function getUnreadCount(userId) {
  const result = await pool.query(`
    SELECT COUNT(*) AS count
    FROM messages
    WHERE receiver_id = $1 AND is_read = FALSE
  `, [userId]);
  
  return parseInt(result.rows[0].count);
}

/**
 * Xóa tin nhắn (chỉ người gửi mới xóa được)
 */
async function deleteMessage(messageId, userId) {
  const result = await pool.query(`
    DELETE FROM messages
    WHERE message_id = $1 AND sender_id = $2
    RETURNING *
  `, [messageId, userId]);
  
  return result.rows[0];
}

/**
 * Kiểm tra xem conversation có tồn tại không
 */
async function getConversation(user1Id, user2Id) {
  const smallerId = Math.min(user1Id, user2Id);
  const largerId = Math.max(user1Id, user2Id);
  
  const result = await pool.query(`
    SELECT * FROM conversations
    WHERE user1_id = $1 AND user2_id = $2
  `, [smallerId, largerId]);
  
  return result.rows[0] || null;
}

module.exports = {
  searchUsers,
  getUserConversations,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  getUnreadCount,
  deleteMessage,
  getConversation
};
