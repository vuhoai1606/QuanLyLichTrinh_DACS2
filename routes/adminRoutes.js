const router = require('express').Router();
const adminController = require('../controllers/adminController');
const { requireAdmin, attachIP } = require('../middleware/adminMiddleware');

/**
 * ADMIN ROUTES
 * Tất cả routes đều yêu cầu quyền admin
 */

// Apply middleware cho tất cả routes
router.use(requireAdmin);
router.use(attachIP);

// ===== VIEWS (Server-side rendering) =====
router.get('/dashboard', adminController.showDashboard);
router.get('/users', adminController.showUsersPage);
router.get('/notifications', adminController.showNotificationsPage);
router.get('/logs', adminController.showAuditLogsPage);

// ===== API: DASHBOARD =====
router.get('/api/dashboard', adminController.getDashboardData);
router.get('/api/stats/activity', adminController.getActivityStats);

// ===== API: USER MANAGEMENT =====
// Lấy danh sách users (với filter, search, pagination)
router.get('/api/users', adminController.getUsers);

// Lấy chi tiết 1 user
router.get('/api/users/:userId', adminController.getUserDetail);

// Cấp quyền admin
router.post('/api/users/:userId/grant-admin', adminController.grantAdmin);

// Thu hồi quyền admin
router.post('/api/users/:userId/revoke-admin', adminController.revokeAdmin);

// Khóa tài khoản
router.post('/api/users/:userId/ban', adminController.banUser);

// Mở khóa tài khoản
router.post('/api/users/:userId/unban', adminController.unbanUser);

// Xóa người dùng
router.delete('/api/users/:userId', adminController.deleteUser);

// ===== API: SYSTEM NOTIFICATIONS =====
// Lấy danh sách thông báo hệ thống
router.get('/api/notifications', adminController.getSystemNotifications);

// Tạo thông báo hệ thống
router.post('/api/notifications', adminController.createSystemNotification);

// Xóa thông báo hệ thống
router.delete('/api/notifications/:notificationId', adminController.deleteSystemNotification);

// ===== API: AUDIT LOGS =====
// Lấy audit logs
router.get('/api/logs', adminController.getAuditLogs);

module.exports = router;
