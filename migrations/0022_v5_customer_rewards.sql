-- CP SMM V5 foundations for customer experience, rewards, support and campaigns.
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme_id TEXT NOT NULL DEFAULT 'cobalt',
  color_mode TEXT NOT NULL DEFAULT 'system',
  accent_color TEXT,
  background_color TEXT,
  font_family TEXT NOT NULL DEFAULT 'system',
  corner_radius TEXT NOT NULL DEFAULT 'rounded',
  layout_json TEXT NOT NULL DEFAULT '{}',
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS vip_levels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  min_spend INTEGER NOT NULL DEFAULT 0,
  discount_pct REAL NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS user_memberships (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  vip_level_id INTEGER REFERENCES vip_levels(id),
  manual_level_id INTEGER REFERENCES vip_levels(id),
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS membership_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  old_level_id INTEGER,
  new_level_id INTEGER,
  reason TEXT NOT NULL DEFAULT 'spend',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS coupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE COLLATE NOCASE,
  discount_type TEXT NOT NULL CHECK(discount_type IN ('percent','fixed','bonus','free_service')),
  discount_value INTEGER NOT NULL DEFAULT 0,
  max_redemptions INTEGER,
  per_user_limit INTEGER NOT NULL DEFAULT 1,
  starts_at INTEGER,
  ends_at INTEGER,
  first_order_only INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coupon_id INTEGER NOT NULL REFERENCES coupons(id),
  user_id INTEGER NOT NULL,
  order_id INTEGER,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS coupon_redemptions_user ON coupon_redemptions(coupon_id,user_id);
CREATE TABLE IF NOT EXISTS support_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS ticket_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL,
  sender_role TEXT NOT NULL CHECK(sender_role IN ('customer','admin')),
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS tickets_user ON support_tickets(user_id,status,updated_at DESC);
CREATE TABLE IF NOT EXISTS promotions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  reward_amount INTEGER NOT NULL DEFAULT 0,
  reward_type TEXT NOT NULL DEFAULT 'balance',
  starts_at INTEGER,
  ends_at INTEGER,
  max_claims INTEGER,
  enabled INTEGER NOT NULL DEFAULT 1,
  require_channel INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS promotion_claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  promotion_id INTEGER NOT NULL REFERENCES promotions(id),
  user_id INTEGER NOT NULL,
  proof TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by INTEGER,
  created_at INTEGER NOT NULL,
  reviewed_at INTEGER,
  UNIQUE(promotion_id,user_id)
);
CREATE TABLE IF NOT EXISTS free_service_campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  daily_limit INTEGER NOT NULL DEFAULT 1,
  total_limit INTEGER,
  claimed_count INTEGER NOT NULL DEFAULT 0,
  starts_at INTEGER,
  ends_at INTEGER,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS free_service_claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL REFERENCES free_service_campaigns(id),
  user_id INTEGER NOT NULL,
  order_id INTEGER,
  claimed_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS free_claims_daily ON free_service_claims(campaign_id,user_id,claimed_at);
CREATE TABLE IF NOT EXISTS loyalty_accounts (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  points INTEGER NOT NULL,
  kind TEXT NOT NULL,
  ref INTEGER,
  note TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS cashback_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  order_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'credited',
  created_at INTEGER NOT NULL,
  UNIQUE(order_id)
);
CREATE TABLE IF NOT EXISTS message_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO vip_levels(name,min_spend,discount_pct,sort_order) VALUES
 ('Bronze',0,0,1),('Silver',25000000,2,2),('Gold',100000000,5,3),('Platinum',500000000,8,4),('Diamond',1000000000,12,5);
