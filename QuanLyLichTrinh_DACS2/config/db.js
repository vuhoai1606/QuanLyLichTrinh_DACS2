const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 10, // Giảm từ 20 xuống 10 - đủ cho localhost
  min: 2, // Luôn giữ 2 connection sẵn sàng
  idleTimeoutMillis: 10000, // Giảm từ 30s xuống 10s
  connectionTimeoutMillis: 3000, // Tăng từ 2s lên 3s
  keepAlive: true, // Giữ connection alive
  keepAliveInitialDelayMillis: 10000,
});

// Test kết nối - chỉ log 1 lần
let hasConnected = false;
pool.on('connect', () => {
  if (!hasConnected) {
    console.log('✅ Kết nối PostgreSQL thành công!');
    hasConnected = true;
  }
});

pool.on('error', (err) => {
  console.error('❌ Lỗi kết nối PostgreSQL:', err);
});

module.exports = pool;