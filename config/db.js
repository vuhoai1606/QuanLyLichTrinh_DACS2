const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // Số kết nối tối đa
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test kết nối
pool.on('connect', () => {
  console.log('✅ Kết nối PostgreSQL thành công!');
});

pool.on('error', (err) => {
  console.error('❌ Lỗi kết nối PostgreSQL:', err);
  process.exit(-1);
});

module.exports = pool;