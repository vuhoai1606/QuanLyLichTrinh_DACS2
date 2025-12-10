// controllers/reportController.js
const reportService = require('../services/reportService');

exports.getTaskStatusReport = async (req, res) => {
  try {
    const data = await reportService.getTaskStatusReport(req.session.userId);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Controller - getTaskStatusReport:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.getTaskByWeekReport = async (req, res) => {
  try {
    const data = await reportService.getTaskByWeekReport(req.session.userId);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Controller - getTaskByWeekReport:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.getEventTypeReport = async (req, res) => {
  try {
    const data = await reportService.getEventTypeReport(req.session.userId);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Controller - getEventTypeReport:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};