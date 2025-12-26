const adminService = require('../services/adminService');

/**
 * ADMIN CONTROLLER
 * HTTP handlers cho admin panel
 */

/**
 * ===== DASHBOARD & VIEWS =====
 */

// Hiển thị trang admin dashboard
exports.showDashboard = async (req, res) => {
  try {
    const overview = await adminService.getDashboardOverview();
    const activityStats = await adminService.getActivityStats(7); // 7 ngày
    
    res.render('admin-dashboard', {
      active: 'admin-dashboard',
      title: 'Admin Dashboard',
      overview,
      activityStats,
      user: {
        user_id: req.session.userId,
        username: req.session.username,
        full_name: req.session.fullName,
        role: req.session.role
      }
    });
  } catch (error) {
    console.error('❌ showDashboard error:', error);
    res.status(500).render('error', { message: 'Lỗi tải dashboard' });
  }
};

// Hiển thị trang quản lý users
exports.showUsersPage = async (req, res) => {
  try {
    res.render('admin-users', {
      active: 'admin-users',
      title: 'Quản lý người dùng',
      currentUserId: req.session.userId,
      user: {
        user_id: req.session.userId,
        username: req.session.username,
        full_name: req.session.fullName,
        role: req.session.role
      }
    });
  } catch (error) {
    console.error('❌ showUsersPage error:', error);
    res.status(500).render('error', { message: 'Lỗi tải trang' });
  }
};

// Hiển thị trang quản lý thông báo
exports.showNotificationsPage = async (req, res) => {
  try {
    res.render('admin-notifications', {
      active: 'admin-notifications',
      title: 'Quản lý thông báo',
      user: {
        user_id: req.session.userId,
        username: req.session.username,
        full_name: req.session.fullName,
        role: req.session.role
      }
    });
  } catch (error) {
    console.error('❌ showNotificationsPage error:', error);
    res.status(500).render('error', { message: 'Lỗi tải trang' });
  }
};

// Hiển thị trang audit logs
exports.showAuditLogsPage = async (req, res) => {
  try {
    res.render('admin-logs', {
      active: 'admin-logs',
      title: 'Audit Logs',
      user: {
        user_id: req.session.userId,
        username: req.session.username,
        full_name: req.session.fullName,
        role: req.session.role
      }
    });
  } catch (error) {
    console.error('❌ showAuditLogsPage error:', error);
    res.status(500).render('error', { message: 'Lỗi tải trang' });
  }
};

/**
 * ===== API: DASHBOARD =====
 */

// API: Lấy tổng quan dashboard
exports.getDashboardData = async (req, res) => {
  try {
    const overview = await adminService.getDashboardOverview();
    const activityStats = await adminService.getActivityStats(7);
    
    res.json({
      success: true,
      data: {
        overview,
        activityStats
      }
    });
  } catch (error) {
    console.error('❌ getDashboardData error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ===== API: USER MANAGEMENT =====
 */

// API: Lấy danh sách users (có phân trang, filter, search)
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', role = '', status = '' } = req.query;
    
    const result = await adminService.getUsers({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      role,
      status
    });
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('❌ getUsers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API: Lấy chi tiết 1 user
exports.getUserDetail = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const user = await adminService.getUserDetail(userId);
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('❌ getUserDetail error:', error);
    res.status(404).json({ success: false, message: error.message });
  }
};

// API: Cấp quyền admin
exports.grantAdmin = async (req, res) => {
  try {
    const adminId = req.session.userId;
    const targetUserId = parseInt(req.params.userId);
    const ipAddress = req.adminIP;
    
    const result = await adminService.grantAdmin(adminId, targetUserId, ipAddress);
    
    res.json(result);
  } catch (error) {
    console.error('❌ grantAdmin error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// API: Thu hồi quyền admin
exports.revokeAdmin = async (req, res) => {
  try {
    const adminId = req.session.userId;
    const targetUserId = parseInt(req.params.userId);
    const ipAddress = req.adminIP;
    
    const result = await adminService.revokeAdmin(adminId, targetUserId, ipAddress);
    
    res.json(result);
  } catch (error) {
    console.error('❌ revokeAdmin error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// API: Khóa tài khoản
exports.banUser = async (req, res) => {
  try {
    const adminId = req.session.userId;
    const targetUserId = parseInt(req.params.userId);
    const { reason } = req.body;
    const ipAddress = req.adminIP;
    
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do khóa tài khoản' });
    }
    
    const result = await adminService.banUser(adminId, targetUserId, reason, ipAddress);
    
    res.json(result);
  } catch (error) {
    console.error('❌ banUser error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// API: Mở khóa tài khoản
exports.unbanUser = async (req, res) => {
  try {
    const adminId = req.session.userId;
    const targetUserId = parseInt(req.params.userId);
    const ipAddress = req.adminIP;
    
    const result = await adminService.unbanUser(adminId, targetUserId, ipAddress);
    
    res.json(result);
  } catch (error) {
    console.error('❌ unbanUser error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// API: Cấp quyền admin
exports.promoteToAdmin = async (req, res) => {
  try {
    const adminId = req.session.userId;
    const targetUserId = parseInt(req.params.userId);
    const ipAddress = req.adminIP;
    
    // Không cho phép tự cấp quyền cho mình
    if (adminId === targetUserId) {
      return res.status(400).json({ success: false, message: 'Không thể tự cấp quyền cho chính mình' });
    }
    
    const result = await adminService.promoteToAdmin(adminId, targetUserId, ipAddress);
    
    res.json(result);
  } catch (error) {
    console.error('❌ promoteToAdmin error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// API: Xóa người dùng
exports.deleteUser = async (req, res) => {
  try {
    const adminId = req.session.userId;
    const targetUserId = parseInt(req.params.userId);
    const { reason } = req.body;
    const ipAddress = req.adminIP;
    
    // Không cho phép tự xóa chính mình
    if (adminId === targetUserId) {
      return res.status(400).json({ success: false, message: 'Không thể xóa chính mình' });
    }
    
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do xóa tài khoản' });
    }
    
    const result = await adminService.deleteUser(adminId, targetUserId, reason, ipAddress);
    
    res.json(result);
  } catch (error) {
    console.error('❌ deleteUser error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * ===== API: SYSTEM NOTIFICATIONS =====
 */

// API: Lấy danh sách thông báo hệ thống
exports.getSystemNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, isActive } = req.query;
    
    const result = await adminService.getSystemNotifications({
      page: parseInt(page),
      limit: parseInt(limit),
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : null
    });
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('❌ getSystemNotifications error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API: Tạo thông báo hệ thống
exports.createSystemNotification = async (req, res) => {
  try {
    const adminId = req.session.userId;
    const { title, content, type, startDate, endDate, targetUsers } = req.body;
    const ipAddress = req.adminIP;
    
    // Validation
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Tiêu đề không được để trống' });
    }
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Nội dung không được để trống' });
    }
    
    const notification = await adminService.createSystemNotification(
      adminId,
      { title, content, type, startDate, endDate, targetUsers },
      ipAddress
    );
    
    res.json({
      success: true,
      message: 'Đã tạo thông báo',
      notification
    });
  } catch (error) {
    console.error('❌ createSystemNotification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API: Xóa thông báo hệ thống
exports.deleteSystemNotification = async (req, res) => {
  try {
    const adminId = req.session.userId;
    const notificationId = parseInt(req.params.notificationId);
    const ipAddress = req.adminIP;
    
    const result = await adminService.deleteSystemNotification(adminId, notificationId, ipAddress);
    
    res.json(result);
  } catch (error) {
    console.error('❌ deleteSystemNotification error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * ===== API: AUDIT LOGS =====
 */

// API: Lấy audit logs
exports.getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, actionType = '', adminId } = req.query;
    
    const result = await adminService.getAuditLogs({
      page: parseInt(page),
      limit: parseInt(limit),
      actionType,
      adminId: adminId ? parseInt(adminId) : null
    });
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('❌ getAuditLogs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API: Xóa nhiều logs cùng lúc
exports.deleteMultipleLogs = async (req, res) => {
  try {
    const adminId = req.session.userId;
    const { logIds } = req.body;
    const ipAddress = req.adminIP;
    
    if (!Array.isArray(logIds) || logIds.length === 0) {
      return res.status(400).json({ success: false, message: 'logIds phải là array và không được rỗng' });
    }
    
    const result = await adminService.deleteMultipleLogs(adminId, logIds, ipAddress);
    
    res.json(result);
  } catch (error) {
    console.error('❌ deleteMultipleLogs error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * ===== API: STATISTICS =====
 */

// API: Thống kê hoạt động (cho charts)
exports.getActivityStats = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const stats = await adminService.getActivityStats(parseInt(days));
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ getActivityStats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
