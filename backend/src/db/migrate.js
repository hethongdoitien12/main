import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/xu_economy' });

const schema = `
-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user','creator','admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallets (one per user)
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance BIGINT DEFAULT 0 CHECK (balance >= 0),  -- stored in mt (integer, no decimals)
  total_earned BIGINT DEFAULT 0,
  total_spent BIGINT DEFAULT 0,
  total_withdrawn BIGINT DEFAULT 0,
  locked_balance BIGINT DEFAULT 0,               -- MT đang chờ xử lý
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ledger entries (append-only, double-entry bookkeeping)
CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,   -- prevents double-spend
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'deposit',       -- nạp tiền thật -> mt
    'withdrawal',    -- rút mt -> tiền thật
    'earn_quest',    -- hoàn thành quest
    'earn_game',     -- chơi game
    'earn_referral', -- giới thiệu bạn
    'earn_content',  -- tạo content
    'spend_ticket',  -- mua vé
    'spend_item',    -- mua item thế giới ảo
    'spend_agent',   -- thuê AI agent
    'spend_music',   -- mua license nhạc
    'spend_boost',   -- boost post
    'tip_sent',      -- gửi tip cho creator
    'tip_received',  -- nhận tip
    'expire',        -- mt hết hạn
    'refund',        -- hoàn mt
    'admin_adjust'   -- admin điều chỉnh
  )),
  amount BIGINT NOT NULL,                          -- dương = nhận, âm = chi
  balance_before BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  reference_id UUID,                               -- ticket_id, item_id, ...
  reference_type VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  description TEXT,
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending','completed','failed','reversed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_ledger_user_id ON ledger_entries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_type ON ledger_entries(type);
CREATE INDEX IF NOT EXISTS idx_ledger_idempotency ON ledger_entries(idempotency_key);

-- Thêm earn_checkin vào constraint nếu chưa có
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'ledger_entries_type_check'
      AND check_clause LIKE '%earn_checkin%'
  ) THEN
    ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_type_check;
    ALTER TABLE ledger_entries ADD CONSTRAINT ledger_entries_type_check CHECK (type IN (
      'deposit','withdrawal',
      'earn_quest','earn_game','earn_referral','earn_content','earn_checkin',
      'spend_ticket','spend_item','spend_agent','spend_music','spend_boost',
      'tip_sent','tip_received',
      'expire','refund','admin_adjust'
    ));
  END IF;
END $$;

-- Daily check-in records
CREATE TABLE IF NOT EXISTS daily_checkins (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checked_in_date  DATE NOT NULL,
  streak_day       INTEGER NOT NULL DEFAULT 1,
  xu_earned        BIGINT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, checked_in_date)
);
CREATE INDEX IF NOT EXISTS idx_checkins_user ON daily_checkins(user_id, checked_in_date DESC);

-- Referral columns (thêm vào users nếu chưa có)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='referral_code') THEN
    ALTER TABLE users ADD COLUMN referral_code VARCHAR(10) UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='referred_by') THEN
    ALTER TABLE users ADD COLUMN referred_by UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='referral_reward_claimed') THEN
    ALTER TABLE users ADD COLUMN referral_reward_claimed BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='banned_at') THEN
    ALTER TABLE users ADD COLUMN banned_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='ban_reason') THEN
    ALTER TABLE users ADD COLUMN ban_reason TEXT DEFAULT NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by) WHERE referred_by IS NOT NULL;

-- Quests
CREATE TABLE IF NOT EXISTS quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('daily','weekly','one_time','event')),
  category VARCHAR(50) CHECK (category IN ('game','music','social','content','referral')),
  reward_xu BIGINT NOT NULL,
  requirement JSONB NOT NULL,   -- {"action": "play_game", "count": 3}
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User quest progress
CREATE TABLE IF NOT EXISTS user_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  quest_id UUID NOT NULL REFERENCES quests(id),
  progress JSONB DEFAULT '{}',
  current_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','claimed','expired')),
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, quest_id)
);

-- Deposit requests (nạp tiền)
CREATE TABLE IF NOT EXISTS deposit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  amount_vnd BIGINT NOT NULL,      -- VNĐ
  amount_xu BIGINT NOT NULL,       -- MT nhận được
  exchange_rate DECIMAL(10,4) DEFAULT 1.0,
  payment_method VARCHAR(50) CHECK (payment_method IN ('momo','zalopay','vnpay','bank_transfer')),
  payment_ref VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','refunded')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Withdrawal requests (rút tiền)
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  amount_xu BIGINT NOT NULL,
  amount_vnd BIGINT NOT NULL,      -- sau khi trừ phí
  fee_xu BIGINT DEFAULT 0,         -- phí rút
  bank_name VARCHAR(100),
  bank_account VARCHAR(50),
  account_name VARCHAR(200),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','cancelled')),
  notes TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tip transactions
CREATE TABLE IF NOT EXISTS tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id),
  receiver_id UUID NOT NULL REFERENCES users(id),
  amount_xu BIGINT NOT NULL,
  platform_fee BIGINT DEFAULT 0,
  message TEXT,
  reference_type VARCHAR(50),   -- 'livestream', 'content', 'music'
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL DEFAULT 'system',
  title VARCHAR(200) NOT NULL,
  body TEXT,
  read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read) WHERE read = false;

-- Broadcast logs — lịch sử gửi thông báo hàng loạt
CREATE TABLE IF NOT EXISTS broadcast_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id       UUID NOT NULL REFERENCES users(id),
  title          VARCHAR(200) NOT NULL,
  body           TEXT,
  type           VARCHAR(50) NOT NULL DEFAULT 'system',
  target         VARCHAR(20) NOT NULL DEFAULT 'all',
  recipient_count INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- MT Expiry Batches — theo dõi từng lô MT khuyến mãi sẽ hết hạn
CREATE TABLE IF NOT EXISTS xu_expiry_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_entry_id UUID REFERENCES ledger_entries(id),
  source_type VARCHAR(50) NOT NULL,   -- 'quest', 'referral', 'bonus'
  amount_xu BIGINT NOT NULL,
  remaining_xu BIGINT NOT NULL,       -- số MT còn lại chưa expire
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','expired','consumed')),
  expired_at TIMESTAMPTZ,
  expire_entry_id UUID REFERENCES ledger_entries(id)
);
CREATE INDEX IF NOT EXISTS idx_expiry_user ON xu_expiry_batches(user_id, status);
CREATE INDEX IF NOT EXISTS idx_expiry_date ON xu_expiry_batches(expires_at) WHERE status = 'active';

-- Email OTPs for registration verification
CREATE TABLE IF NOT EXISTS email_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_otps_email ON email_otps(email, created_at DESC);

-- Platform config (phí, tỷ giá, giới hạn — có thể chỉnh từ Admin)
CREATE TABLE IF NOT EXISTS platform_config (
  key         VARCHAR(100) PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO platform_config (key, value, description) VALUES
  ('WITHDRAWAL_FEE_PCT',      '0.10',    'Phí rút tiền (số thập phân, vd: 0.10 = 10%)'),
  ('TIP_PLATFORM_FEE_PCT',    '0.05',    'Phí platform khi tip (vd: 0.05 = 5%)'),
  ('DEPOSIT_FEE_PCT',         '0',       'Phí nạp tiền (0 = miễn phí)'),
  ('VND_PER_XU',              '1',       'Tỷ giá: 1 MT = ? VNĐ'),
  ('XU_FREE_EXPIRE_DAYS',     '90',      'Số ngày MT thưởng hết hạn'),
  ('MIN_WITHDRAWAL_XU',       '50000',   'Số MT tối thiểu để rút'),
  ('KYC_THRESHOLD_XU',        '1000000', 'Ngưỡng MT cần KYC khi rút')
ON CONFLICT (key) DO NOTHING;

-- Thêm bank_transfer_ref vào withdrawal_requests nếu chưa có
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='withdrawal_requests' AND column_name='bank_transfer_ref') THEN
    ALTER TABLE withdrawal_requests ADD COLUMN bank_transfer_ref VARCHAR(255);
  END IF;
END $$;

-- Thêm các cột KYC vào users nếu chưa có
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='kyc_status') THEN
    ALTER TABLE users ADD COLUMN kyc_status VARCHAR(20) DEFAULT 'none' CHECK (kyc_status IN ('none','pending','verified'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='kyc_full_name') THEN
    ALTER TABLE users ADD COLUMN kyc_full_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='kyc_id_number') THEN
    ALTER TABLE users ADD COLUMN kyc_id_number VARCHAR(20);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='kyc_submitted_at') THEN
    ALTER TABLE users ADD COLUMN kyc_submitted_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='kyc_verified_at') THEN
    ALTER TABLE users ADD COLUMN kyc_verified_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='kyc_photo_url') THEN
    ALTER TABLE users ADD COLUMN kyc_photo_url TEXT;
  END IF;
END $$;

-- Shop items (vật phẩm có thể mua bằng MT)
CREATE TABLE IF NOT EXISTS shop_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(200) NOT NULL,
  description TEXT,
  category    VARCHAR(50) NOT NULL CHECK (category IN ('badge','frame','boost','ticket','exclusive')),
  icon        VARCHAR(20) DEFAULT '🎁',
  price_mt    BIGINT NOT NULL CHECK (price_mt > 0),
  stock       INTEGER DEFAULT NULL,   -- NULL = không giới hạn
  sold_count  INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT true,
  is_limited  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Shop purchases (lịch sử mua)
CREATE TABLE IF NOT EXISTS shop_purchases (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id        UUID NOT NULL REFERENCES shop_items(id),
  amount_mt      BIGINT NOT NULL,
  ledger_entry_id UUID REFERENCES ledger_entries(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shop_purchases_user ON shop_purchases(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shop_purchases_item ON shop_purchases(item_id);

-- Unique constraint on shop item name
CREATE UNIQUE INDEX IF NOT EXISTS idx_shop_items_name ON shop_items(name);

-- Thêm transfer_sent, transfer_received, gift_redeem vào ledger constraint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'ledger_entries_type_check'
      AND check_clause LIKE '%transfer_sent%'
  ) THEN
    ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_type_check;
    ALTER TABLE ledger_entries ADD CONSTRAINT ledger_entries_type_check CHECK (type IN (
      'deposit','withdrawal',
      'earn_quest','earn_game','earn_referral','earn_content','earn_checkin','earn_bonus',
      'spend_ticket','spend_item','spend_agent','spend_music','spend_boost',
      'tip_sent','tip_received',
      'transfer_sent','transfer_received',
      'gift_redeem',
      'expire','refund','admin_adjust'
    ));
  END IF;
END $$;

-- Gift codes (mã quà tặng)
CREATE TABLE IF NOT EXISTS gift_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(50) UNIQUE NOT NULL,
  amount_xu   BIGINT NOT NULL,
  max_uses    INT DEFAULT 1,
  uses        INT DEFAULT 0,
  expires_at  TIMESTAMPTZ,
  note        TEXT,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gift_code_redemptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id     UUID NOT NULL REFERENCES gift_codes(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(code_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_gift_redemptions_user ON gift_code_redemptions(user_id);

-- Seed gift codes mẫu
INSERT INTO gift_codes (code, amount_xu, max_uses, note) VALUES
  ('WELCOME500',  500,  100, 'Quà tặng chào mừng'),
  ('TEST1000',   1000,   50, 'Code test nội bộ'),
  ('VIP5000',    5000,   10, 'Code VIP giới hạn')
ON CONFLICT (code) DO NOTHING;

-- Seed default shop items
INSERT INTO shop_items (name, description, category, icon, price_mt, is_limited) VALUES
  ('Badge Người Dùng Vàng',   'Hiển thị huy hiệu ✨ bên cạnh tên của bạn',           'badge',     '🏅', 5000,   false),
  ('Badge Creator Nổi Bật',   'Huy hiệu đặc biệt dành cho creator tích cực',          'badge',     '⭐', 10000,  false),
  ('Badge VIP Platinum',      'Huy hiệu cao cấp nhất — số lượng có hạn!',             'badge',     '💎', 50000,  true),
  ('Khung Avatar Tím',        'Khung avatar gradient tím ánh kim',                    'frame',     '🖼', 8000,   false),
  ('Khung Avatar Vàng',       'Khung avatar vàng rực rỡ cho người dùng thành tích',   'frame',     '🌟', 15000,  false),
  ('Boost Hiển Thị x2',       'Tăng gấp đôi lượt hiển thị bài đăng trong 7 ngày',    'boost',     '🚀', 20000,  false),
  ('Vé Sự Kiện Đặc Biệt',    'Vé tham gia sự kiện độc quyền tháng này',              'ticket',    '🎫', 30000,  true),
  ('Gói Exclusive Member',    'Quyền lợi thành viên đặc biệt trong 30 ngày',          'exclusive', '👑', 100000, true)
ON CONFLICT DO NOTHING;

-- Platform stats (aggregate, updated via triggers or cron)
CREATE TABLE IF NOT EXISTS platform_stats (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  total_xu_circulating BIGINT DEFAULT 0,
  total_xu_deposited BIGINT DEFAULT 0,
  total_xu_withdrawn BIGINT DEFAULT 0,
  total_xu_earned BIGINT DEFAULT 0,
  total_xu_spent BIGINT DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,
  gross_revenue_vnd BIGINT DEFAULT 0
);

-- Function to update wallet balance atomically
CREATE OR REPLACE FUNCTION update_wallet_balance(
  p_user_id UUID,
  p_amount BIGINT,
  p_type VARCHAR,
  p_idempotency_key VARCHAR,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type VARCHAR DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS ledger_entries AS $$
DECLARE
  v_wallet wallets%ROWTYPE;
  v_entry ledger_entries%ROWTYPE;
BEGIN
  -- Lock wallet row to prevent race condition
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
  END IF;
  
  -- Check sufficient balance for debit
  IF p_amount < 0 AND (v_wallet.balance + p_amount) < 0 THEN
    RAISE EXCEPTION 'Insufficient balance. Current: %, Required: %', v_wallet.balance, ABS(p_amount);
  END IF;
  
  -- Insert ledger entry (idempotency_key prevents duplicates)
  INSERT INTO ledger_entries (
    idempotency_key, user_id, type, amount,
    balance_before, balance_after,
    reference_id, reference_type, description, metadata
  ) VALUES (
    p_idempotency_key, p_user_id, p_type, p_amount,
    v_wallet.balance, v_wallet.balance + p_amount,
    p_reference_id, p_reference_type, p_description, p_metadata
  ) RETURNING * INTO v_entry;
  
  -- Update wallet balance
  UPDATE wallets SET
    balance = balance + p_amount,
    total_earned = CASE WHEN p_amount > 0 THEN total_earned + p_amount ELSE total_earned END,
    total_spent = CASE WHEN p_amount < 0 AND p_type NOT LIKE 'withdraw%' THEN total_spent + ABS(p_amount) ELSE total_spent END,
    total_withdrawn = CASE WHEN p_type = 'withdrawal' THEN total_withdrawn + ABS(p_amount) ELSE total_withdrawn END,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN v_entry;
END;
$$ LANGUAGE plpgsql;
`;

async function migrate() {
  try {
    console.log('Running migrations...');
    await pool.query(schema);
    console.log('✅ Migration completed successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
