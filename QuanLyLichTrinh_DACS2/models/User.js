const pool = require('../config/db');
const bcrypt = require('bcrypt');

class User {
  // Tìm user theo username
  static async findByUsername(username) {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Tìm user theo email
  static async findByEmail(email) {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Tìm user theo ID
  static async findById(userId) {
    try {
      const result = await pool.query(
        'SELECT user_id, username, email, full_name, date_of_birth, avatar_url, created_at FROM users WHERE user_id = $1',
        [userId]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Tạo user mới
  static async create(userData) {
    const { username, password, email, fullName, dateOfBirth, gender, phoneNumber } = userData;
    
    try {
      // Mã hóa mật khẩu bằng bcrypt
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Avatar mặc định
      const defaultAvatar = '/img/default-avatar.jpg';

      const result = await pool.query(
        `INSERT INTO users (username, password_hash, email, full_name, date_of_birth, gender, phone_number, avatar_url) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         RETURNING user_id, username, email, full_name, date_of_birth, gender, phone_number, avatar_url, created_at`,
        [username, passwordHash, email, fullName, dateOfBirth || null, gender || null, phoneNumber || null, defaultAvatar]
      );

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // So sánh mật khẩu
  static async comparePassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật remember_token
  static async updateRememberToken(userId, token) {
    try {
      await pool.query(
        'UPDATE users SET remember_token = $1 WHERE user_id = $2',
        [token, userId]
      );
    } catch (error) {
      throw error;
    }
  }

  // Xóa remember_token (logout)
  static async clearRememberToken(userId) {
    try {
      await pool.query(
        'UPDATE users SET remember_token = NULL WHERE user_id = $1',
        [userId]
      );
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;