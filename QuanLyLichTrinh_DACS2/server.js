const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
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
const calendarRoutes = require('./routes/calendarRoutes');
const kanbanRoutes = require('./routes/kanbanRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const timelineRoutes = require('./routes/timelineRoutes');
const reportRoutes = require('./routes/reportRoutes');
const profileRoutes = require('./routes/profileRoutes');
const googleRoutes = require('./routes/googleRoutes');

// Import middleware
const { setUserLocals } = require('./middleware/authMiddleware');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const PORT = process.env.PORT || 8888;

// ✅ SOCKET.IO - Export để dùng ở controllers
global.io = io;

// Track online users: Map của userId -> socketId
const onlineUsers = new Map();
global.onlineUsers = onlineUsers;

io.on('connection', (socket) => {
  console.log('👤 Client connected:', socket.id);
  
  // User join - Lưu thông tin user online
  socket.on('user:join', (userId) => {
    if (userId) {
      onlineUsers.set(userId, socket.id);
      socket.userId = userId; // Lưu userId vào socket để dễ xử lý
      socket.join(`user:${userId}`); // Join room riêng của user
      console.log(`✅ User ${userId} joined with socket ${socket.id}`);
      
      // Emit online status to all users
      io.emit('user:online', { userId, socketId: socket.id });
    }
  });
  
  socket.on('disconnect', () => {
    // Remove user from online list
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit('user:offline', { userId: socket.userId });
      console.log(`❌ User ${socket.userId} disconnected`);
    }
    console.log('👤 Client disconnected:', socket.id);
  });
});

// Compression middleware - Nén response để giảm bandwidth
app.use(compression());

// Tắt logging không cần thiết để tăng performance
app.set('x-powered-by', false);

// Middleware - Tối ưu thứ tự
app.use(express.json({ limit: '1mb' })); // Giới hạn request size
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Config session với PostgreSQL Store
app.use(session({
  store: new pgSession({
    pool: pool, // Dùng PostgreSQL pool có sẵn
    tableName: 'user_sessions', // Tên bảng lưu session
    createTableIfMissing: true // Tự động tạo bảng nếu chưa có
  }),
  secret: process.env.JWT_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 giờ (sẽ đổi thành 30 ngày nếu Remember Me)
    httpOnly: true,
    secure: false, // TODO: true khi deploy HTTPS
    sameSite: 'strict' // Chống CSRF
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

// Serve uploads folder (avatars + messages)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d', // Cache files 7 ngày
  etag: true
}));

// Serve locales folder (translation files)
app.use('/locales', express.static(path.join(__dirname, 'assets', 'locales'), {
  maxAge: '1d',
  etag: true
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
app.use('/api/calendar', calendarRoutes);
app.use('/', kanbanRoutes);
app.use('/', notificationRoutes);
app.use('/', timelineRoutes);
app.use('/', reportRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/google', googleRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
});

// Error handler (đơn giản hóa, không dùng view)
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Lỗi server',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
    console.log(`🔌 Socket.IO ready for realtime updates`);
    
    // ✅ Khởi động notification scheduler để emit scheduled notifications
    const { startNotificationScheduler } = require('./services/notificationScheduler');
    startNotificationScheduler();
});

const { startGoogleSyncScheduler } = require('./config/googleSyncScheduler');
startGoogleSyncScheduler();