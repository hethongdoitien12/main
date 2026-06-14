import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/xu_economy' });

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Test users
    const hash = await bcrypt.hash('password123', 10);
    const users = [
      ['admin_xu', 'admin@xu.vn', hash, 'admin'],
      ['creator_nam', 'nam@creator.vn', hash, 'creator'],
      ['user_linh', 'linh@user.vn', hash, 'user'],
    ];

    for (const [username, email, password_hash, role] of users) {
      const { rows: [user] } = await client.query(`
        INSERT INTO users (username, email, password_hash, role)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (email) DO NOTHING
        RETURNING id
      `, [username, email, password_hash, role]);

      if (user) {
        await client.query(
          'INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
          [user.id]
        );
        // Give test users some XU
        if (role !== 'admin') {
          await client.query(`
            UPDATE wallets SET balance = 10000, total_earned = 10000
            WHERE user_id = $1
          `, [user.id]);
        }
      }
    }

    // Quests
    const quests = [
      {
        title: 'Chào mừng bạn mới!', description: 'Đăng nhập lần đầu tiên',
        type: 'one_time', category: 'social', rewardXu: 500,
        requirement: { action: 'login', count: 1 }
      },
      {
        title: 'Chiến binh âm nhạc', description: 'Nghe 10 bản nhạc trong ngày',
        type: 'daily', category: 'music', rewardXu: 100,
        requirement: { action: 'listen_music', count: 10 }
      },
      {
        title: 'Game thủ cần mẫn', description: 'Chơi game 30 phút hôm nay',
        type: 'daily', category: 'game', rewardXu: 150,
        requirement: { action: 'play_game_minutes', count: 30 }
      },
      {
        title: 'Creator nội dung', description: 'Đăng 1 bài lên thế giới ảo',
        type: 'weekly', category: 'content', rewardXu: 300,
        requirement: { action: 'post_content', count: 1 }
      },
      {
        title: 'Đại sứ thương hiệu', description: 'Mời 3 bạn bè đăng ký',
        type: 'one_time', category: 'referral', rewardXu: 1500,
        requirement: { action: 'refer_friend', count: 3 }
      },
      {
        title: 'Nhà thám hiểm', description: 'Ghé thăm 5 thế giới ảo khác nhau',
        type: 'weekly', category: 'game', rewardXu: 200,
        requirement: { action: 'visit_world', count: 5 }
      },
      {
        title: 'Siêu fan', description: 'Tip cho 3 creator khác nhau',
        type: 'weekly', category: 'social', rewardXu: 250,
        requirement: { action: 'send_tip', count: 3 }
      },
    ];

    for (const q of quests) {
      await client.query(`
        INSERT INTO quests (title, description, type, category, reward_xu, requirement)
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT DO NOTHING
      `, [q.title, q.description, q.type, q.category, q.rewardXu, q.requirement]);
    }

    await client.query('COMMIT');
    console.log('✅ Seed completed');
    console.log('\n📋 Test accounts:');
    console.log('   admin@xu.vn / password123 (admin)');
    console.log('   nam@creator.vn / password123 (creator, 10,000 XU)');
    console.log('   linh@user.vn / password123 (user, 10,000 XU)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
