import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seedIfEmpty() {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) FROM users');
    const count = parseInt(rows[0].count, 10);

    if (count > 0) {
      console.log(`⏭️  Database đã có ${count} user, bỏ qua seed.`);
      return;
    }

    console.log('🌱 Database trống, đang seed dữ liệu mẫu...');
    const { default: { execSync } } = await import('child_process');
    execSync('node src/db/seed.js', { stdio: 'inherit' });
  } catch (err) {
    console.error('❌ Seed-if-empty thất bại:', err.message);
  } finally {
    await pool.end();
  }
}

seedIfEmpty();
