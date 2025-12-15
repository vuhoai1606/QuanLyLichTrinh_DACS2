// routes/reportRoutes.js - PHIÊN BẢN HOÀN CHỈNH CUỐI CÙNG

const express = require('express');
const router = express.Router();
const reportService = require('../services/reportService');
const puppeteer = require('puppeteer');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

// 1. Thống kê trạng thái task
router.get('/api/reports/tasks/status', async (req, res) => {
  try {
    const data = await reportService.getTaskStatusReport(req.session.userId);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error /tasks/status:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// 2. Thống kê task theo thời gian
router.get('/api/reports/tasks/by-period', async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    const data = await reportService.getTasksByPeriod(req.session.userId, period);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error /tasks/by-period:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// 3. Phân loại sự kiện (hỗ trợ filter tháng/năm)
router.get('/api/reports/events', async (req, res) => {
  try {
    const { month, year } = req.query;
    const data = await reportService.getEventTypeReport(req.session.userId, { month, year });
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error /events:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// 4. Xem báo cáo
router.post('/api/reports/create', async (req, res) => {
  try {
    const result = await reportService.createMonthlyReport(req.session.userId);
    res.json(result);
  } catch (err) {
    console.error('Error create report:', err);
    res.status(500).json({ success: false, message: 'Lỗi tạo báo cáo' });
  }
});

// 5. Gửi email báo cáo
router.post('/api/reports/email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Thiếu email' });
    const result = await reportService.emailMonthlyReport(req.session.userId, email);
    res.json(result);
  } catch (err) {
    console.error('Error send email report:', err);
    res.status(500).json({ success: false, message: 'Lỗi gửi email' });
  }
});

// 6. Tải PDF
router.get('/api/reports/download-pdf', async (req, res) => {
  try {
    const html = await reportService.generateReportHTML(req.session.userId);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
    });

    await browser.close();

    const now = new Date();
    const monthYear = now.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
    const fileNameVi = `Báo cáo tháng ${monthYear}.pdf`;
    const fileNameEn = `Monthly_Report_${now.getFullYear()}_${now.getMonth() + 1}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileNameEn}"; filename*=UTF-8''${encodeURIComponent(fileNameVi)}`
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generate PDF:', err);
    res.status(500).json({ success: false, message: 'Lỗi tạo PDF' });
  }
});

// 7. Hiệu suất tuần này
router.get('/api/reports/productivity', async (req, res) => {
  try {
    const data = await reportService.getWeeklyProductivity(req.session.userId);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error productivity:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// 8. Biểu đồ Hoàn thành vs Tạo mới (7 ngày gần nhất)
router.get('/api/reports/completed-vs-created', async (req, res) => {
  try {
    const data = await reportService.getCompletedVsCreated(req.session.userId);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error completed-vs-created:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// 9. Top 5 danh mục task phổ biến nhất (hỗ trợ filter tháng/năm)
router.get('/api/reports/top-categories', async (req, res) => {
  try {
    const { month, year } = req.query;
    const data = await reportService.getTopTaskCategories(req.session.userId, { month, year });
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error top-categories:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// 10. Summary tổng quan tháng (hỗ trợ filter tháng/năm)
router.get('/api/reports/summary', async (req, res) => {
  try {
    const { month, year } = req.query;
    const data = await reportService.getMonthlySummary(req.session.userId, { month, year });
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error summary:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

module.exports = router;