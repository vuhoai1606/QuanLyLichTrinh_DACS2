const seedUsers = require('./userSeeder');

/**
 * SEEDER RUNNER
 * =============
 * Chạy tất cả các seeder files
 * 
 * CÁCH DÙNG:
 * node seeder/index.js
 */

async function runAllSeeders() {
  try {
    console.log('═══════════════════════════════════════');
    console.log('🌱🌱🌱 BẮT ĐẦU SEEDING DATABASE...');
    console.log('═══════════════════════════════════════\n');

    // Chạy user seeder
    await seedUsers();

    // Có thể thêm các seeder khác ở đây
    // await seedCategories();
    // await seedTasks();
    // await seedEvents();

    console.log('\n═══════════════════════════════════════');
    console.log('✅✅✅ HOÀN TẤT TẤT CẢ SEEDERS!');
    console.log('═══════════════════════════════════════');
    
    process.exit(0);
  } catch (error) {
    console.error('\n═══════════════════════════════════════');
    console.error('❌❌❌ LỖI KHI SEED:');
    console.error(error);
    console.error('═══════════════════════════════════════');
    
    process.exit(1);
  }
}

// Chạy seeders
runAllSeeders();
