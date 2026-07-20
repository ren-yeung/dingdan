// 本地全链路测试：wrangler pages dev 默认端口 8788
const BASE = 'http://localhost:8788'
let pass = 0, fail = 0
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log('  PASS', name) }
  else { fail++; console.log('  FAIL', name, extra) }
}
async function call(method, path, body, token) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = 'Bearer ' + token
  const r = await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined })
  let data = null
  try { data = await r.json() } catch (e) {}
  return { status: r.status, data }
}

const main = async () => {
  console.log('== 登录 ==')
  const admin = await call('POST', '/api/login', { username: 'admin', password: 'admin123' })
  check('admin 登录 200', admin.status === 200, JSON.stringify(admin.data))
  const admT = admin.data.token
  const sales = await call('POST', '/api/login', { username: 'sales', password: 'sales123' })
  check('sales 登录 200', sales.status === 200)
  const salesT = sales.data.token
  check('token 含 user', admin.data.user && admin.data.user.role === 'admin')

  console.log('== 提交商机（sales）==')
  const opp = await call('POST', '/api/opportunities', {
    company_name: '测试公司A', handler: '张三', phone: '13800000000', install_address: '北京',
    local_operator: '电信', bandwidth: '100M', country: '美国', website: 'https://a.com',
    business_license: '', storefront_photo: '', office_photo: ''
  }, salesT)
  check('提交商机 201', opp.status === 201, JSON.stringify(opp.data))
  const oppId = opp.data.id

  console.log('== 列表与权限 ==')
  const salesList = await call('GET', '/api/opportunities', undefined, salesT)
  check('sales 能看到自己的商机', salesList.data.some(o => o.id === oppId))
  const adminList = await call('GET', '/api/opportunities', undefined, admT)
  check('admin 能看到全部', adminList.data.some(o => o.id === oppId))
  check('列表带回 submitter_name', !!adminList.data[0].submitter_name)

  console.log('== 审核（admin 通过）==')
  const rev = await call('POST', `/api/opportunities/${oppId}/review`, { status: 'approved', admin_reply: 'OK' }, admT)
  check('审核通过', rev.status === 200)

  console.log('== 测试转正式订单 ==')
  const conv = await call('POST', '/api/orders/convert', { opportunity_id: oppId, owner_id: sales.data.user.id }, admT)
  check('转单 201', conv.status === 201, JSON.stringify(conv.data))
  check('公司名→实际使用方', conv.data.actual_user === '测试公司A')
  check('经办人→订单经办人', conv.data.handler === '张三')
  check('电话→联系电话', conv.data.contact_phone === '13800000000')
  check('国家带过来', conv.data.country === '美国')
  check('下个付款日默认=合作日期', conv.data.next_payment_date === conv.data.cooperation_date)

  console.log('== 订单列表 ==')
  const orders = await call('GET', '/api/orders', undefined, admT)
  check('订单已生成', orders.data.some(o => o.id === conv.data.id))
  check('订单带回 owner_name', !!orders.data.find(o => o.id === conv.data.id).owner_name)

  console.log('== 看板 ==')
  const month = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0')
  const dash = await call('GET', '/api/dashboard?month=' + month, undefined, admT)
  check('看板返回业绩数字', typeof dash.data.total_performance === 'number', JSON.stringify(dash.data).slice(0, 200))
  check('看板 ranking 含 name', dash.data.ranking.every(r => 'name' in r))
  check('看板 recent_orders 有数据', Array.isArray(dash.data.recent_orders))

  console.log('== 权限隔离 ==')
  const salesConvert = await call('POST', '/api/orders/convert', { opportunity_id: 99999 }, salesT)
  check('sales 不能转单(403)', salesConvert.status === 403, 'got ' + salesConvert.status)

  console.log('== 设置（admin）==')
  const users = await call('GET', '/api/users', undefined, admT)
  check('用户列表含3个', users.data.length >= 3)
  const prod = await call('POST', '/api/products', { name: '新专线', description: 'x' }, admT)
  check('新建产品 201', prod.status === 201)

  console.log('== 图片上传（R2）==')
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
  const fd = new FormData()
  fd.append('file', new Blob([png], { type: 'image/png' }), 'test.png')
  const up = await fetch(BASE + '/api/upload', { method: 'POST', headers: { Authorization: 'Bearer ' + admT }, body: fd })
  const upData = await up.json()
  check('上传返回 url', up.status === 200 && upData.url && upData.url.startsWith('/uploads/'), JSON.stringify(upData))
  if (upData.url) {
    const imgRes = await fetch(BASE + upData.url)
    check('图片可访问', imgRes.status === 200, 'got ' + imgRes.status)
  }

  console.log(`\n结果：PASS=${pass} FAIL=${fail}`)
  process.exit(fail ? 1 : 0)
}
main().catch(e => { console.error('ERROR', e); process.exit(2) })
