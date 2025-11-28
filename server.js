const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const compression = require('compression');
require('dotenv').config();

// Import database
const pool = require('./config/db');

// Import routes
const authRoutes = require('./routes/authRoutes');
const indexRoutes = require('./routes/index');
const taskRoutes = require('./routes/taskRoutes');
const eventRoutes = require('./routes/eventRoutes');

// Import middleware
const { setUserLocals } = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 8888;

// Compression middleware - Nén response để giảm bandwidth
app.use(compression());

// Tắt logging không cần thiết để tăng performance
app.set('x-powered-by', false);

// Middleware - Tối ưu thứ tự
app.use(express.json({ limit: '1mb' })); // Giới hạn request size
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Config session - Tối ưu
app.use(session({
  secret: process.env.JWT_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 giờ
    httpOnly: true,
    secure: false
  },
  rolling: true, // Gia hạn session mỗi request
  name: 'sessionId' // Đổi tên cookie mặc định
}));

// Config template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Config static files với cache
app.use(express.static(path.join(__dirname, 'assets'), {
  maxAge: '1d', // Cache static files 1 ngày
  etag: true,
  lastModified: true
}));

// Middleware thêm thông tin user vào views
app.use(setUserLocals);

// Test database connection route
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      success: true,
      message: 'Kết nối database thành công!',
      time: result.rows[0].now
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi kết nối database',
      error: error.message
    });
  }
});

// Routes
app.use('/', authRoutes);
app.use('/', indexRoutes);
app.use('/', taskRoutes);
app.use('/', eventRoutes);

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});