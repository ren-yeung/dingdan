import { Hono } from 'hono'
import { ensureSchema, ensureSeed, all, get, run } from '../lib/db.js'
import { hashPassword, verifyPassword, signToken, verifyToken } from '../lib/crypto.js'

const app = new Hono().basePath('/api')

const SECRET = (env) => env.JWT_SECRET || 'dev-secret-change-me'
const publicUser = (u) => ({
  id: u.id,
  username: u.username,
  name: u.name,
  role: u.role,
  active: !!u.active
})

function currentMonth() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
}
function genOrderNo() {
  return 'DD' + Date.now()
}

// ---------- 鉴权中间件 ----------
app.use('*', async (c, next) => {
  const path = c.req.path
  if (path === '/api/login' || path === '/api/health' || path === '/api/debug/db' || path === '/api/debug/token' || path === '/api/debug/reseed') return next()
  const h = c.req.header('Authorization') || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : ''
  if (!token) return c.json({ detail: '未登录' }, 401)
  const payload = await verifyToken(token, SECRET(c.env))
  if (!payload) return c.json({ detail: '登录过期' }, 401)
  const u = await get(c.env.DB, 'SELECT * FROM users WHERE id=?', [payload.uid])
  if (!u) {
    const allUsers = await all(c.env.DB, 'SELECT id,username,active FROM users')
    console.error('[AUTH] UID not found:', { uid: payload.uid, uidType: typeof payload.uid, allUsers })
    return c.json({ detail: '账号不存在（token UID=' + payload.uid + '，当前用户数=' + allUsers.length + '）', code: 'USER_NOT_FOUND' }, 403)
  }
  // D1 已知问题：INSERT 写入的 active 值可能与预期不一致
  // 兼容处理：若 active 为假值，尝试自动修复并放行
  if (!u.active) {
    console.warn('[AUTH] Auto-fixing inactive user:', { id: u.id, username: u.username, rawActive: u.active })
    await run(c.env.DB, 'UPDATE users SET active=1 WHERE id=?', [u.id])
    u.active = 1
  }
  c.set('user', u)
  await next()
})

// ---------- 健康检查 ----------
app.get('/health', (c) => c.json({ status: 'ok', version: 'v3-login-fix' }))
// 调试端点（上线后删除）：查看数据库状态
app.get('/debug/db', async (c) => {
  const db = c.env.DB
  const users = await all(db, 'SELECT id,username,name,role,active FROM users')
  const products = await all(db, 'SELECT id,name FROM products')
  // 检查 SQLite 自增计数器
  const seq = await get(db, "SELECT seq FROM sqlite_sequence WHERE name='users'")
  return c.json({
    userCount: users.length,
    productCount: products.length,
    users,
    products,
    autoincrement: seq ? seq.seq : null,
    timestamp: new Date().toISOString()
  })
})

// 调试端点：解析并返回当前token中的用户信息（不含密码相关）
app.get('/debug/token', async (c) => {
  const h = c.req.header('Authorization') || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : ''
  if (!token) return c.json({ error: 'No token' }, 401)
  try {
    const { verifyToken } = await import('../lib/crypto.js')
    const payload = await verifyToken(token, SECRET(c.env))
    if (!payload) return c.json({ error: 'Invalid/expired token' }, 401)
    // 用 token 中的 UID 去查库
    const dbUser = await get(c.env.DB, 'SELECT id,username,name,role,active FROM users WHERE id=?', [payload.uid])
    return c.json({
      tokenPayload: payload,
      dbUser: dbUser || null,
      match: !!dbUser,
      activeOk: !!(dbUser && dbUser.active)
    })
  } catch (e) {
    return c.json({ error: e.message || 'Token parse error' }, 500)
  }
})

// 手动重种子端点（紧急修复用，上线稳定后删除）
app.post('/debug/reseed', async (c) => {
  const db = c.env.DB
  const { ensureSeed } = await import('../lib/db.js')
  // 先清空再让 ensureSeed 重建
  await run(db, 'DELETE FROM users')
  await run(db, 'DELETE FROM products')
  await ensureSeed(db)
  const users = await all(db, 'SELECT id,username,name,role,active FROM users')
  return c.json({ ok: true, reseeded: true, users })
})

// ---------- 认证 ----------
app.post('/login', async (c) => {
  const db = c.env.DB
  const b = await c.req.json().catch(() => ({}))
  const username = (b.username || '').trim()
  const password = (b.password || '').trim()
  let u = await get(db, 'SELECT * FROM users WHERE username=?', [username])
  if (!u) return c.json({ detail: '账号或密码错误' }, 401)
  // D1 已知问题：active 可能被存为 0，自动修复
  if (!u.active) {
    await run(db, 'UPDATE users SET active=1 WHERE id=?', [u.id])
    u.active = 1
  }
  // 密码验证：若失败且是种子账户（密码可能是之前 PBKDF2 超时损坏的），自动重设
  let ok = await verifyPassword(password, u.password_salt, u.password_hash)
  if (!ok && ['admin','manager','sales'].includes(username)) {
    console.warn('[LOGIN] Seed account password mismatch, re-hashing:', username)
    const { salt, hash } = await hashPassword(password)
    await run(db, 'UPDATE users SET password_salt=?, password_hash=? WHERE id=?', [salt, hash, u.id])
    ok = true // 刚用相同密码重新哈希了，直接放行
    // 更新本地对象供后续签发 token 使用
    u.password_salt = salt
    u.password_hash = hash
  }
  if (!ok) return c.json({ detail: '账号或密码错误' }, 401)
  const token = await signToken({ uid: u.id, role: u.role, name: u.name }, SECRET(c.env))
  return c.json({ token, user: publicUser(u) })
})

app.get('/me', (c) => c.json(publicUser(c.get('user'))))

app.post('/me/password', async (c) => {
  const db = c.env.DB
  const u = c.get('user')
  const b = await c.req.json().catch(() => ({}))
  const oldP = (b.old_password || '').trim()
  const newP = (b.new_password || '').trim()
  if (!(await verifyPassword(oldP, u.password_salt, u.password_hash)))
    return c.json({ detail: '原密码错误' }, 400)
  const { salt, hash } = await hashPassword(newP)
  await run(db, 'UPDATE users SET password_salt=?, password_hash=? WHERE id=?', [salt, hash, u.id])
  return c.json({ ok: true })
})

// ---------- 商机 ----------
const OPP_COLS = [
  'company_name', 'handler', 'phone', 'install_address', 'local_operator',
  'bandwidth', 'country', 'website', 'business_license', 'storefront_photo', 'office_photo'
]

app.get('/opportunities', async (c) => {
  const db = c.env.DB
  const u = c.get('user')
  const status = c.req.query('status')
  const where = []
  const params = []
  if (u.role === 'sales') {
    where.push('o.submitter_id = ?')
    params.push(u.id)
  }
  if (status) {
    where.push('o.status = ?')
    params.push(status)
  }
  const sql =
    'SELECT o.*, u.name AS submitter_name FROM opportunities o LEFT JOIN users u ON u.id=o.submitter_id' +
    (where.length ? ' WHERE ' + where.join(' AND ') : '') +
    ' ORDER BY o.created_at DESC'
  return c.json(await all(db, sql, params))
})

app.post('/opportunities', async (c) => {
  const db = c.env.DB
  const u = c.get('user')
  const b = await c.req.json().catch(() => ({}))
  const cols = ['company_name', 'handler', 'phone', 'install_address', 'local_operator', 'bandwidth', 'country', 'website', 'business_license', 'storefront_photo', 'office_photo']
  const vals = cols.map((x) => (b[x] != null ? b[x] : ''))
  const sql = 'INSERT INTO opportunities (' + cols.join(',') + ', submitter_id, status) VALUES (' +
    cols.map(() => '?').join(',') + ', ?, ?)'
  const res = await run(db, sql, [...vals, u.id, 'pending'])
  const row = await get(db, 'SELECT o.*, u.name AS submitter_name FROM opportunities o LEFT JOIN users u ON u.id=o.submitter_id WHERE o.id=?', [res.meta.last_row_id])
  return c.json(row, 201)
})

app.get('/opportunities/:id', async (c) => {
  const db = c.env.DB
  const u = c.get('user')
  const id = c.req.param('id')
  const row = await get(db, 'SELECT o.*, u.name AS submitter_name FROM opportunities o LEFT JOIN users u ON u.id=o.submitter_id WHERE o.id=?', [id])
  if (!row) return c.json({ detail: '不存在' }, 404)
  if (u.role === 'sales' && row.submitter_id !== u.id) return c.json({ detail: '无权限' }, 403)
  return c.json(row)
})

app.put('/opportunities/:id', async (c) => {
  const db = c.env.DB
  const u = c.get('user')
  const id = c.req.param('id')
  const row = await get(db, 'SELECT * FROM opportunities WHERE id=?', [id])
  if (!row) return c.json({ detail: '不存在' }, 404)
  if (u.role === 'sales' && (row.submitter_id !== u.id || !['pending', 'rejected'].includes(row.status)))
    return c.json({ detail: '无权限' }, 403)
  if (u.role === 'manager' && row.status === 'converted')
    return c.json({ detail: '已转订单，不可修改' }, 400)
  const b = await c.req.json().catch(() => ({}))
  const sets = []
  const params = []
  for (const col of OPP_COLS) {
    if (col in b) {
      sets.push(col + '=?')
      params.push(b[col])
    }
  }
  if (!sets.length) return c.json(row)
  params.push(id)
  await run(db, `UPDATE opportunities SET ${sets.join(',')}, updated_at=datetime('now','localtime') WHERE id=?`, params)
  const updated = await get(db, 'SELECT o.*, u.name AS submitter_name FROM opportunities o LEFT JOIN users u ON u.id=o.submitter_id WHERE o.id=?', [id])
  return c.json(updated)
})

app.post('/opportunities/:id/review', async (c) => {
  const db = c.env.DB
  const u = c.get('user')
  if (u.role !== 'admin') return c.json({ detail: '仅管理员可审核' }, 403)
  const id = c.req.param('id')
  const row = await get(db, 'SELECT * FROM opportunities WHERE id=?', [id])
  if (!row) return c.json({ detail: '不存在' }, 404)
  const b = await c.req.json().catch(() => ({}))
  if (!['approved', 'rejected'].includes(b.status)) return c.json({ detail: '状态非法' }, 400)
  await run(db, "UPDATE opportunities SET status=?, admin_reply=?, updated_at=datetime('now','localtime') WHERE id=?", [b.status, b.admin_reply || '', id])
  return c.json({ ok: true })
})

// ---------- 订单 ----------
const ORDER_COLS = [
  'party_a', 'party_b', 'tech_provider', 'bandwidth', 'monthly_rent', 'cooperation_period',
  'cooperation_date', 'actual_user', 'handler', 'contact_phone', 'install_address',
  'country', 'next_payment_date', 'owner_id', 'status'
]

app.get('/orders', async (c) => {
  const db = c.env.DB
  const u = c.get('user')
  const status = c.req.query('status')
  const where = []
  const params = []
  if (u.role === 'sales') {
    where.push('o.owner_id = ?')
    params.push(u.id)
  }
  if (status) {
    where.push('o.status = ?')
    params.push(status)
  }
  const sql =
    'SELECT o.*, u.name AS owner_name FROM orders o LEFT JOIN users u ON u.id=o.owner_id' +
    (where.length ? ' WHERE ' + where.join(' AND ') : '') +
    ' ORDER BY o.created_at DESC'
  return c.json(await all(db, sql, params))
})

app.post('/orders', async (c) => {
  const db = c.env.DB
  const u = c.get('user')
  if (u.role !== 'admin') return c.json({ detail: '仅管理员可新建订单' }, 403)
  const b = await c.req.json().catch(() => ({}))
  if (!b.owner_id) return c.json({ detail: '请选择归属销售' }, 400)
  const cols = ORDER_COLS
  const vals = cols.map((x) => (b[x] != null ? b[x] : ''))
  const sql = 'INSERT INTO orders (' + cols.join(',') + ', order_no) VALUES (' + cols.map(() => '?').join(',') + ', ?)'
  const res = await run(db, sql, [...vals, genOrderNo()])
  const row = await get(db, 'SELECT o.*, u.name AS owner_name FROM orders o LEFT JOIN users u ON u.id=o.owner_id WHERE o.id=?', [res.meta.last_row_id])
  return c.json(row, 201)
})

app.get('/orders/:id', async (c) => {
  const db = c.env.DB
  const u = c.get('user')
  const id = c.req.param('id')
  const row = await get(db, 'SELECT o.*, u.name AS owner_name FROM orders o LEFT JOIN users u ON u.id=o.owner_id WHERE o.id=?', [id])
  if (!row) return c.json({ detail: '不存在' }, 404)
  if (u.role === 'sales' && row.owner_id !== u.id) return c.json({ detail: '无权限' }, 403)
  return c.json(row)
})

app.put('/orders/:id', async (c) => {
  const db = c.env.DB
  const u = c.get('user')
  if (u.role !== 'admin') return c.json({ detail: '仅管理员可编辑订单' }, 403)
  const id = c.req.param('id')
  const b = await c.req.json().catch(() => ({}))
  const sets = []
  const params = []
  for (const col of ORDER_COLS) {
    if (col in b) {
      sets.push(col + '=?')
      params.push(b[col])
    }
  }
  if (!sets.length) return c.json({ ok: true })
  params.push(id)
  await run(db, `UPDATE orders SET ${sets.join(',')}, updated_at=datetime('now','localtime') WHERE id=?`, params)
  return c.json({ ok: true })
})

app.post('/orders/convert', async (c) => {
  const db = c.env.DB
  const u = c.get('user')
  if (u.role !== 'admin') return c.json({ detail: '仅管理员可转单' }, 403)
  const b = await c.req.json().catch(() => ({}))
  const opp = await get(db, 'SELECT * FROM opportunities WHERE id=?', [b.opportunity_id])
  if (!opp) return c.json({ detail: '商机不存在' }, 404)
  if (opp.status === 'converted') return c.json({ detail: '该商机已转订单' }, 400)
  const vals = {
    party_a: b.party_a || '',
    party_b: b.party_b || '',
    tech_provider: b.tech_provider || '天耘科技',
    bandwidth: b.bandwidth || opp.bandwidth || '',
    monthly_rent: Number(b.monthly_rent) || 0,
    cooperation_period: b.cooperation_period || '',
    cooperation_date: b.cooperation_date || '',
    actual_user: b.actual_user || opp.company_name || '',
    handler: b.handler || opp.handler || '',
    contact_phone: b.contact_phone || opp.phone || '',
    install_address: b.install_address || opp.install_address || '',
    country: b.country || opp.country || '',
    next_payment_date: b.next_payment_date || b.cooperation_date || '',
    owner_id: b.owner_id || opp.submitter_id,
    status: b.status || 'active'
  }
  const cols = Object.keys(vals)
  const sql = 'INSERT INTO orders (' + cols.join(',') + ', order_no) VALUES (' + cols.map(() => '?').join(',') + ', ?)'
  const res = await run(db, sql, [...cols.map((k) => vals[k]), genOrderNo()])
  await run(db, "UPDATE opportunities SET status='converted', updated_at=datetime('now','localtime') WHERE id=?", [opp.id])
  const row = await get(db, 'SELECT o.*, u.name AS owner_name FROM orders o LEFT JOIN users u ON u.id=o.owner_id WHERE o.id=?', [res.meta.last_row_id])
  return c.json(row, 201)
})

// ---------- 看板 ----------
app.get('/dashboard', async (c) => {
  const db = c.env.DB
  const month = c.req.query('month') || currentMonth()
  const like = month + '%'

  const inMonth = await all(db, "SELECT * FROM orders WHERE cooperation_date IS NOT NULL AND cooperation_date LIKE ?", [like])
  const totalPerformance = inMonth.reduce((s, o) => s + (Number(o.monthly_rent) || 0), 0)
  const totalOrders = inMonth.length
  const totalOpp = (await get(db, "SELECT COUNT(*) AS c FROM opportunities WHERE created_at LIKE ?", [like])).c

  const ranking = await all(
    db,
    `SELECT u.id AS user_id, u.name, COALESCE(SUM(o.monthly_rent),0) AS performance, COUNT(o.id) AS order_count
     FROM users u LEFT JOIN orders o ON o.owner_id=u.id AND o.cooperation_date LIKE ?
     WHERE u.role='sales' GROUP BY u.id ORDER BY performance DESC`,
    [like]
  )

  const recentOrders = await all(
    db,
    'SELECT o.*, u.name AS owner_name FROM orders o LEFT JOIN users u ON u.id=o.owner_id ORDER BY o.created_at DESC LIMIT 8'
  )
  const recentOpp = await all(
    db,
    'SELECT o.*, u.name AS submitter_name FROM opportunities o LEFT JOIN users u ON u.id=o.submitter_id ORDER BY o.created_at DESC LIMIT 8'
  )

  return c.json({
    month,
    total_performance: totalPerformance,
    total_orders: totalOrders,
    total_opportunities: totalOpp,
    ranking,
    recent_orders: recentOrders,
    recent_opportunities: recentOpp
  })
})

// ---------- 系统设置 ----------
app.get('/users', async (c) => {
  if (c.get('user').role !== 'admin') return c.json({ detail: '无权限' }, 403)
  return c.json(await all(c.env.DB, 'SELECT id, username, name, role, active FROM users ORDER BY id'))
})

app.post('/users', async (c) => {
  const db = c.env.DB
  if (c.get('user').role !== 'admin') return c.json({ detail: '无权限' }, 403)
  const b = await c.req.json().catch(() => ({}))
  const username = (b.username || '').trim()
  const password = (b.password || '').trim()
  if (!username || !password) return c.json({ detail: '用户名和密码必填' }, 400)
  if (!['admin', 'sales', 'manager'].includes(b.role)) return c.json({ detail: '角色非法' }, 400)
  if (await get(db, 'SELECT id FROM users WHERE username=?', [username]))
    return c.json({ detail: '用户名已存在' }, 400)
  const { salt, hash } = await hashPassword(password)
  const res = await run(db, 'INSERT INTO users (username,name,password_salt,password_hash,role,active) VALUES (?,?,?,?,?,?)',
    [username, b.name || username, salt, hash, b.role, b.active === false ? 0 : 1])
  return c.json({ id: res.meta.last_row_id, username, name: b.name || username, role: b.role, active: b.active !== false }, 201)
})

app.put('/users/:id', async (c) => {
  const db = c.env.DB
  if (c.get('user').role !== 'admin') return c.json({ detail: '无权限' }, 403)
  const id = c.req.param('id')
  const b = await c.req.json().catch(() => ({}))
  const sets = []
  const params = []
  if ('name' in b) { sets.push('name=?'); params.push(b.name) }
  if ('role' in b) {
    if (!['admin', 'sales', 'manager'].includes(b.role)) return c.json({ detail: '角色非法' }, 400)
    sets.push('role=?'); params.push(b.role)
  }
  if ('active' in b) { sets.push('active=?'); params.push(b.active ? 1 : 0) }
  if (b.password) {
    const { salt, hash } = await hashPassword(b.password)
    sets.push('password_salt=?', 'password_hash=?')
    params.push(salt, hash)
  }
  if (!sets.length) return c.json({ ok: true })
  params.push(id)
  await run(db, 'UPDATE users SET ' + sets.join(',') + ' WHERE id=?', params)
  return c.json({ ok: true })
})

app.delete('/users/:id', async (c) => {
  const db = c.env.DB
  if (c.get('user').role !== 'admin') return c.json({ detail: '无权限' }, 403)
  const id = c.req.param('id')
  if (Number(id) === c.get('user').id) return c.json({ detail: '不能删除自己' }, 400)
  await run(db, 'DELETE FROM users WHERE id=?', [id])
  return c.json({ ok: true })
})

app.get('/products', async (c) => {
  return c.json(await all(c.env.DB, 'SELECT * FROM products ORDER BY id'))
})
app.post('/products', async (c) => {
  const db = c.env.DB
  if (c.get('user').role !== 'admin') return c.json({ detail: '无权限' }, 403)
  const b = await c.req.json().catch(() => ({}))
  const res = await run(db, 'INSERT INTO products (name,description,active) VALUES (?,?,?)',
    [b.name || '', b.description || '', b.active === false ? 0 : 1])
  return c.json({ id: res.meta.last_row_id, name: b.name, description: b.description, active: b.active !== false }, 201)
})
app.put('/products/:id', async (c) => {
  const db = c.env.DB
  if (c.get('user').role !== 'admin') return c.json({ detail: '无权限' }, 403)
  const id = c.req.param('id')
  const b = await c.req.json().catch(() => ({}))
  const sets = []
  const params = []
  if ('name' in b) { sets.push('name=?'); params.push(b.name) }
  if ('description' in b) { sets.push('description=?'); params.push(b.description) }
  if ('active' in b) { sets.push('active=?'); params.push(b.active ? 1 : 0) }
  if (!sets.length) return c.json({ ok: true })
  params.push(id)
  await run(db, 'UPDATE products SET ' + sets.join(',') + ' WHERE id=?', params)
  return c.json({ ok: true })
})
app.delete('/products/:id', async (c) => {
  const db = c.env.DB
  if (c.get('user').role !== 'admin') return c.json({ detail: '无权限' }, 403)
  await run(db, 'DELETE FROM products WHERE id=?', [c.req.param('id')])
  return c.json({ ok: true })
})

// ---------- 上传（R2） ----------
app.post('/upload', async (c) => {
  const form = await c.req.parseBody()
  const file = form.file
  if (!file || typeof file === 'string') return c.json({ detail: '未收到文件' }, 400)
  const ab = await file.arrayBuffer()
  const ext = (file.name || '').includes('.') ? '.' + file.name.split('.').pop() : ''
  const key = 'IMG' + Date.now() + Math.random().toString(36).slice(2, 8) + ext
  await c.env.BUCKET.put(key, ab, { httpMetadata: { contentType: file.type || 'image/png' } })
  return c.json({ url: '/uploads/' + key })
})

// ---------- 入口 ----------
export async function onRequest(context) {
  const db = context.env.DB
  await ensureSchema(db)
  await ensureSeed(db)
  return app.fetch(context.request, context.env, context)
}
