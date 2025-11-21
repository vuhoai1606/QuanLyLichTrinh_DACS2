const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Config session
app.use(session({
  secret: process.env.JWT_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 giờ
    httpOnly: true,
    secure: false // Đổi thành true nếu dùng HTTPS
  }
}));

// Config template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Config static files
app.use(express.static(path.join(__dirname, 'assets')));

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