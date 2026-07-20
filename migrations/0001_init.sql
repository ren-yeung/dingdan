-- D1 初始化（Cloudflare 版后端由 functions/lib/db.js 的 ensureSchema 自动建表，此文件仅供手动参考/执行）
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  password_salt TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'sales',
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS opportunities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL DEFAULT '',
  handler TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  install_address TEXT NOT NULL DEFAULT '',
  local_operator TEXT NOT NULL DEFAULT '',
  bandwidth TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  business_license TEXT NOT NULL DEFAULT '',
  storefront_photo TEXT NOT NULL DEFAULT '',
  office_photo TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  admin_reply TEXT NOT NULL DEFAULT '',
  submitter_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT NOT NULL DEFAULT '',
  party_a TEXT NOT NULL DEFAULT '',
  party_b TEXT NOT NULL DEFAULT '',
  tech_provider TEXT NOT NULL DEFAULT '天耘科技',
  bandwidth TEXT NOT NULL DEFAULT '',
  monthly_rent REAL NOT NULL DEFAULT 0,
  cooperation_period TEXT NOT NULL DEFAULT '',
  cooperation_date TEXT,
  actual_user TEXT NOT NULL DEFAULT '',
  handler TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL DEFAULT '',
  install_address TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  next_payment_date TEXT,
  owner_id INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1
);
