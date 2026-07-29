// D1（Cloudflare 全托管 SQLite）查询封装 + 建表/种子
import { hashPassword } from './crypto.js'

export async function all(db, sql, params = []) {
  const r = await db.prepare(sql).bind(...params).all()
  return r.results || []
}
export async function get(db, sql, params = []) {
  return await db.prepare(sql).bind(...params).first()
}
export async function run(db, sql, params = []) {
  return await db.prepare(sql).bind(...params).run()
}

// 逐条执行，避免 D1 exec 多语句被截断
const SCHEMA_STMTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    password_salt TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'sales'
  )`,
  `CREATE TABLE IF NOT EXISTS opportunities (
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
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
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
  )`,
  `CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE INDEX IF NOT EXISTS idx_opp_submitter ON opportunities(submitter_id)`,
  `CREATE INDEX IF NOT EXISTS idx_opp_status ON opportunities(status)`,
  `CREATE INDEX IF NOT EXISTS idx_order_owner ON orders(owner_id)`,
  `CREATE INDEX IF NOT EXISTS idx_order_date ON orders(cooperation_date)`
]

export async function ensureSchema(db) {
  for (const s of SCHEMA_STMTS) {
    await db.prepare(s).run()
  }
  // 清理旧版本遗留的 active 列（账号禁用功能已移除）
  for (const t of ['users', 'products']) {
    try { await db.prepare('ALTER TABLE ' + t + ' DROP COLUMN active').run() }
    catch (e) { /* 列不存在或 D1 不支持则忽略 */ }
  }
  // 新增设备编号字段（订单归属设备），旧表通过 ALTER 迁移
  try { await db.prepare('ALTER TABLE orders ADD COLUMN device_no TEXT NOT NULL DEFAULT \'\'').run() }
  catch (e) { /* 列已存在则忽略 */ }
}

// 仅在表空时种子；绝不自动删重建（D1 同请求内写后读可能不一致，会导致中间件查不到用户）
export async function ensureSeed(db) {
  const row = await get(db, 'SELECT COUNT(*) AS c FROM users')
  if (row && row.c > 0) return // 已有数据，直接返回
  await _seed(db)
}

async function _seed(db) {
  const seedUsers = [
    ['admin', '管理员', 'admin123', 'admin'],
    ['manager', '销售主管', 'manager123', 'manager'],
    ['sales', '销售员', 'sales123', 'sales']
  ]
  for (const [username, name, pw, role] of seedUsers) {
    const { salt, hash } = await hashPassword(pw)
    await run(
      db,
      'INSERT INTO users (username,name,password_salt,password_hash,role) VALUES (?,?,?,?,?)',
      [username, name, salt, hash, role]
    )
  }
  await run(db, "INSERT INTO products (name,description) VALUES (?,?)", [
    'SD-WAN 专线',
    '软件定义广域网专线接入'
  ])
}
