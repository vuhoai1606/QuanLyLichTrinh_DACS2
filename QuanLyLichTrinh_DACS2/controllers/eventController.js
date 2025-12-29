// controllers/eventController.js

const eventService = require('../services/eventService');
const notificationService = require('../services/notificationService');
const pool = require('../config/db');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

// Helper: Tạo oauth2Client với auto refresh token
async function getOAuth2Client(user) {
  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: user.google_access_token,
    refresh_token: user.google_refresh_token
  });

  // Auto refresh khi access_token hết hạn
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await pool.query(
        'UPDATE users SET google_access_token = $1 WHERE user_id = $2',
        [tokens.access_token, user.user_id]
      );
    }
  });

  return oauth2Client;
}

// Lấy danh sách events của user
exports.getEvents = async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Vui lòng đăng nhập' 
      });
    }

    const filters = {
      startDate: req.query.start_date || req.query.startDate,
      endDate: req.query.end_date || req.query.endDate,
      search: req.query.search
    };

    const events = await eventService.getEventsByUser(userId, filters);

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Error getting events:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server khi lấy danh sách events',
      error: error.message 
    });
  }
};

// Lấy events theo khoảng thời gian (dùng cho calendar)
exports.getEventsByDateRange = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { year, month } = req.query;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Vui lòng đăng nhập' 
      });
    }

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu tham số year hoặc month'
      });
    }

    const events = await eventService.getEventsByMonth(
      userId, 
      parseInt(year), 
      parseInt(month)
    );

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Error getting events by date range:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

// Lấy chi tiết 1 event
exports.getEventById = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Vui lòng đăng nhập' 
      });
    }

    const event = await eventService.getEventById(id, userId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy event'
      });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Error getting event:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

// Tạo event mới
exports.createEvent = async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Vui lòng đăng nhập' 
      });
    }

    const eventData = {
      title: req.body.title,
      description: req.body.description,
      startTime: req.body.start_time || req.body.startTime,
      endTime: req.body.end_time || req.body.endTime,
      location: req.body.location,
      locationLat: req.body.location_lat || req.body.locationLat,
      locationLng: req.body.location_lng || req.body.locationLng,
      meetingLink: req.body.meeting_link || req.body.meetingLink,
      categoryId: req.body.category_id || req.body.categoryId,
      color: req.body.color || '#3b82f6',
      tags: req.body.tags || [],
      calendarType: req.body.calendar_type,
      allDay: req.body.all_day || req.body.allDay || false,
      recurrence: req.body.recurrence || null
    };

    const newEvent = await eventService.createEvent(userId, eventData);

    await notificationService.createNotification({
      userId,
      type: 'event',
      title: 'Sự kiện mới',
      message: `Bạn đã tạo sự kiện "${newEvent.title}" bắt đầu lúc ${newEvent.start_time}`, 
      redirectUrl: '/calendar',
      relatedId: newEvent.event_id 
    });

    // === ĐẨY EVENT LÊN GOOGLE CALENDAR ===
    const { rows: [user] } = await pool.query(
      'SELECT google_access_token, google_refresh_token, google_calendar_id FROM users WHERE user_id = $1',
      [userId]
    );

    if (user && user.google_access_token) {
      try {
        const oauth2Client = await getOAuth2Client(user);
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const googleEventData = {
          summary: newEvent.title || '(Không có tiêu đề)',
          description: newEvent.description || '',
          location: newEvent.location || undefined,
          start: newEvent.all_day ? {
            date: newEvent.start_time.toISOString().split('T')[0],
            timeZone: 'Asia/Ho_Chi_Minh'
          } : {
            dateTime: newEvent.start_time.toISOString(),
            timeZone: 'Asia/Ho_Chi_Minh'
          },
          end: newEvent.all_day ? {
            date: newEvent.end_time.toISOString().split('T')[0],
            timeZone: 'Asia/Ho_Chi_Minh'
          } : {
            dateTime: newEvent.end_time.toISOString(),
            timeZone: 'Asia/Ho_Chi_Minh'
          },
          recurrence: newEvent.recurrence || undefined
        };

        const googleRes = await calendar.events.insert({
          calendarId: user.google_calendar_id || 'primary',
          requestBody: googleEventData
        });

        await pool.query(
          'UPDATE events SET google_event_id = $1 WHERE event_id = $2',
          [googleRes.data.id, newEvent.event_id]
        );

        console.log(`[Google Sync] Đã tạo event trên Google Calendar: ${googleRes.data.id}`);
      } catch (googleErr) {
        console.error('[Google Sync] Lỗi khi tạo event trên Google:', googleErr);
        // Không làm fail request chính
      }
    }

    res.status(201).json({
      success: true,
      message: 'Tạo event thành công',
      data: newEvent
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi tạo event'
    });
  }
};

// Cập nhật event
exports.updateEvent = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Vui lòng đăng nhập' 
      });
    }
    
    const updateData = {
      title: req.body.title,
      description: req.body.description,
      startTime: req.body.start_time || req.body.startTime,
      endTime: req.body.end_time || req.body.endTime,
      location: req.body.location,
      locationLat: req.body.location_lat || req.body.locationLat,
      locationLng: req.body.location_lng || req.body.locationLng,
      meetingLink: req.body.meeting_link || req.body.meetingLink,
      categoryId: req.body.category_id || req.body.categoryId,
      color: req.body.color,
      tags: req.body.tags,
      calendarType: req.body.calendar_type,
      allDay: req.body.all_day !== undefined ? req.body.all_day : undefined,
      recurrence: req.body.recurrence !== undefined ? req.body.recurrence : undefined
    };

    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const updatedEvent = await eventService.updateEvent(id, userId, updateData);

    if (!updatedEvent) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy event'
      });
    }

    await notificationService.createNotification({
      userId,
      type: 'event',
      title: 'Cập nhật sự kiện',
      message: `Bạn đã cập nhật sự kiện "${updatedEvent.title}"`,
      redirectUrl: '/calendar',
      relatedId: updatedEvent.event_id
    });

    // === ĐẨY CẬP NHẬT LÊN GOOGLE CALENDAR ===
    const { rows: [user] } = await pool.query(
      'SELECT google_access_token, google_refresh_token, google_calendar_id FROM users WHERE user_id = $1',
      [userId]
    );

    if (user && user.google_access_token && updatedEvent.google_event_id) {
      try {
        const oauth2Client = await getOAuth2Client(user);
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const googleEventData = {
          summary: updatedEvent.title || '(Không có tiêu đề)',
          description: updatedEvent.description || '',
          location: updatedEvent.location || undefined,
          start: updatedEvent.all_day ? {
            date: updatedEvent.start_time.toISOString().split('T')[0],
            timeZone: 'Asia/Ho_Chi_Minh'
          } : {
            dateTime: updatedEvent.start_time.toISOString(),
            timeZone: 'Asia/Ho_Chi_Minh'
          },
          end: updatedEvent.all_day ? {
            date: updatedEvent.end_time.toISOString().split('T')[0],
            timeZone: 'Asia/Ho_Chi_Minh'
          } : {
            dateTime: updatedEvent.end_time.toISOString(),
            timeZone: 'Asia/Ho_Chi_Minh'
          },
          recurrence: updatedEvent.recurrence || undefined
        };

        await calendar.events.patch({
          calendarId: user.google_calendar_id || 'primary',
          eventId: updatedEvent.google_event_id,
          requestBody: googleEventData
        });

        console.log(`[Google Sync] Đã cập nhật event trên Google: ${updatedEvent.google_event_id}`);
      } catch (googleErr) {
        console.error('[Google Sync] Lỗi khi cập nhật event trên Google:', googleErr);
      }
    }

    res.json({
      success: true,
      message: 'Cập nhật event thành công',
      data: updatedEvent
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi cập nhật event'
    });
  }
};

// Xóa event
exports.deleteEvent = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Vui lòng đăng nhập' 
      });
    }

    const deletedResult = await eventService.deleteEvent(id, userId);

    if (!deletedResult.deletedEvent) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy event'
      });
    }

    const deletedEvent = deletedResult.deletedEvent;
    
    await notificationService.createNotification({
      userId,
      type: 'event',
      title: 'Xóa sự kiện',
      message: `Bạn đã xóa sự kiện "${deletedEvent.title}"`, 
      redirectUrl: '/calendar',
      relatedId: id
    });

    // === XÓA TRÊN GOOGLE CALENDAR ===
    const { rows: [user] } = await pool.query(
      'SELECT google_access_token, google_refresh_token, google_calendar_id FROM users WHERE user_id = $1',
      [userId]
    );

    if (user && user.google_access_token && deletedEvent.google_event_id) {
      try {
        const oauth2Client = await getOAuth2Client(user);
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        await calendar.events.delete({
          calendarId: user.google_calendar_id || 'primary',
          eventId: deletedEvent.google_event_id
        });

        console.log(`[Google Sync] Đã xóa event trên Google: ${deletedEvent.google_event_id}`);
      } catch (googleErr) {
        console.error('[Google Sync] Lỗi khi xóa event trên Google:', googleErr);
      }
    }

    res.json({
      success: true,
      message: 'Xóa event thành công'
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa event'
    });
  }
};

// Lấy events sắp diễn ra
exports.getUpcomingEvents = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { limit = 5 } = req.query;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Vui lòng đăng nhập' 
      });
    }

    const events = await eventService.getUpcomingEvents(userId, parseInt(limit));

    res.json({
      success: true,
      events: events || []
    });
  } catch (error) {
    console.error('Error getting upcoming events:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy events sắp diễn ra',
      error: error.message
    });
  }
};