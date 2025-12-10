const pool = require('../config/db');
const bcrypt = require('bcrypt');

/**
 * USER SEEDER
 * ===========
 * Tạo users mẫu để test hệ thống
 * 
 * GIẢI THÍCH:
 * - Seeder là file để tạo dữ liệu mẫu trong database
 * - Giúp test nhanh mà không cần đăng ký thủ công
 * - Dùng ON CONFLICT để không bị lỗi nếu chạy nhiều lần
 */

async function seedUsers() {
  try {
    console.log('🌱 Đang seed users...\n');

    // Danh sách users mẫu
    const users = [
      {
        username: 'admin',
        password: 'admin123',  // Đủ điều kiện: 6+ ký tự, có chữ + số
        email: 'admin@example.com',
        fullName: 'Administrator',
        dateOfBirth: '1990-01-01',
        role: 'admin'
      },
      {
        username: 'user1',
        password: 'user123',
        email: 'user1@example.com',
        fullName: 'Nguyễn Văn A',
        dateOfBirth: '2000-05-15',
        role: 'user'
      },
      {
        username: 'user2',
        password: 'user456',
        email: 'user2@example.com',
        fullName: 'Trần Thị B',
        dateOfBirth: '1998-08-20',
        role: 'user'
      },
    ];

    // Insert từng user
    for (const user of users) {
      try {
        // Hash password với bcrypt (salt rounds = 10)
        const hashedPassword = await bcrypt.hash(user.password, 10);

        // Insert user vào database
        // ON CONFLICT (username) DO NOTHING: Nếu username đã tồn tại thì bỏ qua
        const result = await pool.query(
          `INSERT INTO users (
            username, 
            password_hash, 
            email, 
            full_name, 
            date_of_birth,
            is_email_verified,
            login_provider,
            role
          )
          VALUES ($1, $2, $3, $4, $5, TRUE, 'local', $6)
          ON CONFLICT (username) DO NOTHING
          RETURNING user_id, username`,
          [
            user.username,
            hashedPassword,
            user.email,
            user.fullName,
            user.dateOfBirth,
            user.role
          ]
        );

        if (result.rows.length > 0) {
          console.log(`✅ Đã tạo user: ${user.username}`);
          console.log(`   📧 Email: ${user.email}`);
          console.log(`   🔑 Password: ${user.password}`);
          console.log(`   👤 Role: ${user.role}`);
          console.log(`   🆔  ID: ${result.rows[0].user_id}\n`);
        } else {
          console.log(`⚠️  User ${user.username} đã tồn tại, bỏ qua\n`);
        }
      } catch (error) {
        console.error(`❌ Lỗi tạo user ${user.username}:`, error.message);
      }
    }

    console.log('🎉 Seed users hoàn tất!');
    console.log('\n📝 Bạn có thể đăng nhập với:');
    users.forEach(u => {
      console.log(`   - Username: ${u.username}, Password: ${u.password}`);
    });
  } catch (error) {
    console.error('❌ Lỗi seed users:', error);
    throw error;
  }
}

// Export để dùng trong seeder/index.js
module.exports = seedUsers;

// Nếu chạy trực tiếp file này
if (require.main === module) {
  seedUsers()
    .then(() => {
      console.log('\n✅ Hoàn tất!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Lỗi:', error);
      process.exit(1);
    });
}
