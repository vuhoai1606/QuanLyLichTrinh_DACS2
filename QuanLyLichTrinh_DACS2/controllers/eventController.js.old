const pool = require('../config/db');

// Lấy danh sách events của user
exports.getEvents = async (req, res) => {
  try {
    const userId = req.session.userId;
    
    const result = await pool.query(
      `SELECT e.*, c.category_name, c.color as category_color
       FROM events e
       LEFT JOIN categories c ON e.category_id = c.category_id
       WHERE e.user_id = $1
       ORDER BY e.start_time DESC`,
      [userId]
    );
    
    res.json({ 
      success: true, 
      events: result.rows 
    });
  } catch (error) {
    console.error('Lỗi lấy events:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Không thể lấy danh sách sự kiện' 
    });
  }
};

// Lấy events theo khoảng thời gian (dùng cho calendar)
exports.getEventsByDateRange = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { start_date, end_date } = req.query;
    
    const result = await pool.query(
      `SELECT e.*, c.category_name, c.color as category_color
       FROM events e
       LEFT JOIN categories c ON e.category_id = c.category_id
       WHERE e.user_id = $1 
         AND e.start_time >= $2 
         AND e.end_time <= $3
       ORDER BY e.start_time ASC`,
      [userId, start_date, end_date]
    );
    
    res.json({ 
      success: true, 
      events: result.rows 
    });
  } catch (error) {
    console.error('Lỗi lấy events theo ngày:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Không thể lấy sự kiện' 
    });
  }
};

// Lấy chi tiết 1 event
exports.getEventById = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT e.*, c.category_name, c.color as category_color
       FROM events e
       LEFT JOIN categories c ON e.category_id = c.category_id
       WHERE e.event_id = $1 AND e.user_id = $2`,
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy sự kiện' 
      });
    }
    
    res.json({ 
      success: true, 
      event: result.rows[0] 
    });
  } catch (error) {
    console.error('Lỗi lấy event:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Không thể lấy thông tin sự kiện' 
    });
  }
};

// Tạo event mới
exports.createEvent = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { 
      title, 
      description, 
      start_time, 
      end_time, 
      is_all_day,
      repeat_type,
      category_id,
      alarm_enabled,
      alarm_time,
      alarm_sound_url,
      color
    } = req.body;
    
    // Validation
    if (!title || !start_time || !end_time) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tiêu đề và thời gian là bắt buộc' 
      });
    }
    
    const result = await pool.query(
      `INSERT INTO events (
        user_id, title, description, start_time, end_time, 
        is_all_day, repeat_type, category_id, alarm_enabled,
        alarm_time, alarm_sound_url, color
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
      RETURNING *`,
      [
        userId, 
        title, 
        description || null, 
        start_time, 
        end_time,
        is_all_day || false,
        repeat_type || 'none',
        category_id || null,
        alarm_enabled || false,
        alarm_time || null,
        alarm_sound_url || null,
        color || '#4285F4'
      ]
    );
    
    res.json({ 
      success: true, 
      message: 'Thêm sự kiện thành công',
      event: result.rows[0] 
    });
  } catch (error) {
    console.error('Lỗi tạo event:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Không thể thêm sự kiện' 
    });
  }
};

// Cập nhật event
exports.updateEvent = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;
    const { 
      title, 
      description, 
      start_time, 
      end_time, 
      is_all_day,
      repeat_type,
      category_id,
      alarm_enabled,
      alarm_time,
      alarm_sound_url,
      color
    } = req.body;
    
    // Kiểm tra event có tồn tại và thuộc về user không
    const checkResult = await pool.query(
      'SELECT event_id FROM events WHERE event_id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy sự kiện' 
      });
    }
    
    const result = await pool.query(
      `UPDATE events 
       SET title = $1, description = $2, start_time = $3, end_time = $4,
           is_all_day = $5, repeat_type = $6, category_id = $7,
           alarm_enabled = $8, alarm_time = $9, alarm_sound_url = $10, color = $11
       WHERE event_id = $12 AND user_id = $13 
       RETURNING *`,
      [
        title, 
        description, 
        start_time, 
        end_time,
        is_all_day,
        repeat_type,
        category_id,
        alarm_enabled,
        alarm_time,
        alarm_sound_url,
        color,
        id, 
        userId
      ]
    );
    
    res.json({ 
      success: true, 
      message: 'Cập nhật sự kiện thành công',
      event: result.rows[0] 
    });
  } catch (error) {
    console.error('Lỗi cập nhật event:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Không thể cập nhật sự kiện' 
    });
  }
};

// Xóa event
exports.deleteEvent = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM events WHERE event_id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy sự kiện' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Xóa sự kiện thành công' 
    });
  } catch (error) {
    console.error('Lỗi xóa event:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Không thể xóa sự kiện' 
    });
  }
};
