// controllers/notificationController.js
const Notification = require('../services/notificationService');

exports.getNotifications = async (req, res) => {
  const filter = req.query.filter || 'all';
  const data = await Notification.getAll(req.session.userId, filter);
  res.json({ success: true, ...data });
};

exports.markRead = async (req, res) => {
  await Notification.markAsRead(req.params.id);
  res.json({ success: true });
};

exports.markAllRead = async (req, res) => {
  await Notification.markAllRead(req.session.userId);
  res.json({ success: true });
};

