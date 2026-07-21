import { Hono } from 'hono'
import { ensureSchema, ensureSeed, all, get, run } from '../lib/db.js'
import { hashPassword, verifyPassword, signToken, verifyToken } from '../lib/crypto.js'

const app = new Hono().basePath('/api')

const SECRET = (env) => env.JWT_SECRET || 'dev-secret-change-me'
const publicUser = (u) => ({
  id: u.id,
  username: u.username,
  name: u.name,
  role: u.role
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
  if (!u) return c.json({ detail: '账号不存在' }, 403)
  c.set('user', u)
  await next()
})

// ---------- 健康检查 ----------
app.get('/health', (c) => c.json({ status: 'ok', version: 'v6-no-active' }))
// 调试端点：查看数据库状态
app.get('/debug/db', async (c) => {
  const db = c.env.DB
  const users = await all(db, 'SELECT id,username,name,role FROM users')
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
    const dbUser = await get(c.env.DB, 'SELECT id,username,name,role FROM users WHERE id=?', [payload.uid])
    return c.json({
      tokenPayload: payload,
      dbUser: dbUser || null,
      match: !!dbUser
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
  const users = await all(db, 'SELECT id,username,name,role FROM users')
  return c.json({ ok: true, reseeded: true, users })
})

// ---------- 认证 ----------
app.post('/login', async (c) => {
  const db = c.env.DB
  const b = await c.req.json().catch(() => ({}))
  const username = (b.username || '').trim()
  const password = (b.password || '').trim()
  const u = await get(db, 'SELECT * FROM users WHERE username=?', [username])
  if (!u) return c.json({ detail: '账号或密码错误' }, 401)
  const ok = await verifyPassword(password, u.password_salt, u.password_hash)
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
  // 管理员/主管可指定提交人，销售只能以自己名义提交
  const submitterId = (u.role === 'admin' || u.role === 'manager') && b.submitter_id ? Number(b.submitter_id) : u.id
  const sql = 'INSERT INTO opportunities (' + cols.join(',') + ', submitter_id, status) VALUES (' +
    cols.map(() => '?').join(',') + ', ?, ?)'
  const res = await run(db, sql, [...vals, submitterId, 'pending'])
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
// 看板短期内存缓存：同 isolate 内复用，避免重复聚合与串行查询
const dashboardCache = new Map()
const DASHBOARD_TTL = 30 * 1000

app.get('/dashboard', async (c) => {
  const db = c.env.DB
  const month = c.req.query('month') || currentMonth()
  const like = month + '%'

  // 命中缓存直接返回（30s 内不发任何查询）
  const hit = dashboardCache.get(month)
  if (hit && Date.now() - hit.ts < DASHBOARD_TTL) {
    return c.json(hit.data)
  }

  // 5 个查询并行执行 + 聚合下沉到 SQL，避免串行与全表拉取
  const [agg, oppCount, ranking, recentOrders, recentOpp] = await Promise.all([
    // 本月总业绩：客户季付，按当月成交订单月租 ×3 核算（季付总额）
    get(db, "SELECT COALESCE(SUM(monthly_rent),0)*3 AS total_performance, COUNT(*) AS total_orders FROM orders WHERE cooperation_date IS NOT NULL AND cooperation_date LIKE ?", [like]),
    get(db, "SELECT COUNT(*) AS c FROM opportunities WHERE created_at LIKE ?", [like]),
    // 历史销售排行：全部销售 + 销售主管的订单，按单量（order_count）排行，不限定月份
    // 业绩口径：每单 = (订单开始→下个付款日 的月数) × 月租，按月累加（客户季付，月数≈3）
    all(db, `SELECT u.id AS user_id, u.name,
            COALESCE(SUM(
              CASE WHEN o.next_payment_date IS NOT NULL AND o.next_payment_date > o.cooperation_date
                   THEN ROUND((julianday(o.next_payment_date) - julianday(o.cooperation_date)) / 30.4375) * o.monthly_rent
                   ELSE 0 END
            ), 0) AS performance,
            COUNT(o.id) AS order_count
            FROM users u LEFT JOIN orders o ON o.owner_id=u.id
            WHERE u.role IN ('sales','manager') GROUP BY u.id ORDER BY order_count DESC, performance DESC`, []),
    all(db, 'SELECT o.*, u.name AS owner_name FROM orders o LEFT JOIN users u ON u.id=o.owner_id ORDER BY o.created_at DESC LIMIT 8'),
    all(db, 'SELECT o.*, u.name AS submitter_name FROM opportunities o LEFT JOIN users u ON u.id=o.submitter_id ORDER BY o.created_at DESC LIMIT 8')
  ])

  const data = {
    month,
    total_performance: Number(agg.total_performance) || 0,
    total_orders: agg.total_orders || 0,
    total_opportunities: oppCount.c || 0,
    ranking,
    recent_orders: recentOrders,
    recent_opportunities: recentOpp
  }
  dashboardCache.set(month, { ts: Date.now(), data })
  return c.json(data)
})

// ---------- 系统设置 ----------
app.get('/users', async (c) => {
  if (c.get('user').role !== 'admin') return c.json({ detail: '无权限' }, 403)
  return c.json(await all(c.env.DB, 'SELECT id, username, name, role FROM users ORDER BY id'))
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
  const res = await run(db,
    'INSERT INTO users (username,name,password_salt,password_hash,role) VALUES (?,?,?,?,?)',
    [username, b.name || username, salt, hash, b.role])
  return c.json({ id: res.meta.last_row_id, username, name: b.name || username, role: b.role }, 201)
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
  return c.json(await all(c.env.DB, 'SELECT id, name, description FROM products ORDER BY id'))
})
app.post('/products', async (c) => {
  const db = c.env.DB
  if (c.get('user').role !== 'admin') return c.json({ detail: '无权限' }, 403)
  const b = await c.req.json().catch(() => ({}))
  const res = await run(db,
    'INSERT INTO products (name,description) VALUES (?,?)',
    [b.name || '', b.description || ''])
  return c.json({ id: res.meta.last_row_id, name: b.name, description: b.description }, 201)
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

// ---------- 上传（R2）----------
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
