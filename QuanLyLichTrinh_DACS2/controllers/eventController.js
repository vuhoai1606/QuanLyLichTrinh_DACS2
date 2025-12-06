const eventService = require('../services/eventService');
const notificationService = require('../services/notificationService');

/**
 * EVENT CONTROLLER - Đã tái cấu trúc sử dụng Services
 * ====================================================
 * Controller chỉ xử lý HTTP request/response
 * Business logic đã chuyển sang eventService
 */

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
      isAllDay: req.body.is_all_day || req.body.isAllDay || false,
      location: req.body.location,
      locationLat: req.body.location_lat || req.body.locationLat,
      locationLng: req.body.location_lng || req.body.locationLng,
      meetingLink: req.body.meeting_link || req.body.meetingLink,
      categoryId: req.body.category_id || req.body.categoryId,
      color: req.body.color || '#3b82f6',
      tags: req.body.tags || []
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

    res.status(201).json({
      success: true,
      message: 'Tạo event thành công',
      data: newEvent
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi tạo event',
      error: error.message
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
      isAllDay: req.body.is_all_day || req.body.isAllDay,
      location: req.body.location,
      locationLat: req.body.location_lat || req.body.locationLat,
      locationLng: req.body.location_lng || req.body.locationLng,
      meetingLink: req.body.meeting_link || req.body.meetingLink,
      categoryId: req.body.category_id || req.body.categoryId,
      color: req.body.color,
      tags: req.body.tags
    };

    // Loại bỏ các giá trị undefined
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

    res.json({
      success: true,
      message: 'Cập nhật event thành công',
      data: updatedEvent
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi cập nhật event',
      error: error.message
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

    if (!deletedResult.deletedEvent) { // Kiểm tra nếu không tìm thấy event
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy event'
      });
    }

    // Dùng thông tin từ object event đã xóa
    const deletedEvent = deletedResult.deletedEvent;
    
    await notificationService.createNotification({
      userId,
      type: 'event',
      title: 'Xóa sự kiện',
      message: `Bạn đã xóa sự kiện "${deletedEvent.title}"`, 
      redirectUrl: '/calendar',
      relatedId: id
    });

    res.json({
      success: true,
      message: 'Xóa event thành công'
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa event',
      error: error.message
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
