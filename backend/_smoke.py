import json
import urllib.request
import urllib.error
import io

BASE = "http://localhost:8000/api"


def req(method, path, data=None, token=None, files=None):
    url = BASE + path
    headers = {}
    if token:
        headers["Authorization"] = "Bearer " + token
    if files:
        boundary = "----erpboundary"
        body = io.BytesIO()
        for fk, (fn, fb) in files.items():
            body.write(f"--{boundary}\r\n".encode())
            body.write(f'Content-Disposition: form-data; name="{fk}"; filename="{fn}"\r\n'.encode())
            body.write(b"Content-Type: image/png\r\n\r\n")
            body.write(fb)
            body.write(b"\r\n")
        body.write(f"--{boundary}--\r\n".encode())
        headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"
        raw = body.getvalue()
    elif data is not None:
        headers["Content-Type"] = "application/json"
        raw = json.dumps(data).encode()
    else:
        raw = None
    r = urllib.request.Request(url, data=raw, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def login(username, password):
    s, b = req("POST", "/auth/login", {"username": username, "password": password})
    if s != 200:
        raise SystemExit(f"login {username} failed: {s} {b}")
    return json.loads(b)["token"]


def check(name, cond, extra=""):
    print(("PASS" if cond else "FAIL"), "-", name, extra)


admin = login("admin", "admin123")
sales = login("sales", "sales123")
mgr = login("manager", "manager123")

# 1. sales 提交测试商机
opp = {
    "company_name": "测试科技有限公司",
    "handler": "张三",
    "phone": "13800000000",
    "install_address": "上海市浦东新区xx路1号",
    "business_license": "",
    "storefront_photo": "",
    "office_photo": "",
    "local_operator": "中国电信",
    "bandwidth": "100M",
    "country": "中国",
    "website": "https://example.com",
}
s, b = req("POST", "/opportunities", opp, token=sales)
check("sales 提交商机", s == 200, b[:80])
opp_id = json.loads(b)["id"]

# 2. sales 看自己的商机
s, b = req("GET", "/opportunities", token=sales)
mine = [o for o in json.loads(b) if o["id"] == opp_id]
check("sales 列表含自己的商机", s == 200 and len(mine) == 1)

# 3. manager 看全部
s, b = req("GET", "/opportunities", token=mgr)
allopp = json.loads(b)
check("manager 列表含该商机", s == 200 and any(o["id"] == opp_id for o in allopp))

# 4. sales 改自己的（pending）
s, b = req("PUT", f"/opportunities/{opp_id}", {"bandwidth": "200M"}, token=sales)
check("sales 改自己待审商机", s == 200 and json.loads(b)["bandwidth"] == "200M")

# 5. sales 不能审核 -> 403
s, b = req("POST", f"/opportunities/{opp_id}/review", {"status": "approved"}, token=sales)
check("sales 不能审核(403)", s == 403, f"[{s}]")

# 6. admin 审核通过
s, b = req("POST", f"/opportunities/{opp_id}/review", {"status": "approved", "admin_reply": "资料齐全，通过"}, token=admin)
check("admin 审核通过", s == 200 and json.loads(b)["status"] == "approved")

# 7. 图片上传
png = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4"
    "890000000a49444154789c6360000002000154a24f600000000049454e44ae426082"
)
s, b = req("POST", "/upload", files={"file": ("a.png", png)}, token=sales)
check("图片上传", s == 200, b[:80])
if s == 200:
    img_url = json.loads(b)["url"]
    # 重新提交一张带图的商机用于转订单展示
    opp2 = dict(opp, company_name="带图公司", business_license=img_url,
                storefront_photo=img_url, office_photo=img_url)
    s2, b2 = req("POST", "/opportunities", opp2, token=sales)
    opp2_id = json.loads(b2)["id"]
    req("POST", f"/opportunities/{opp2_id}/review", {"status": "approved", "admin_reply": "ok"}, token=admin)
else:
    opp2_id = None

# 8. admin 转正式订单
conv = {
    "signing_parties": "翼嘉通讯 / 天耘科技",
    "tech_provider": "天耘科技",
    "bandwidth": "200M",
    "monthly_rent": 5000,
    "cooperation_period": "12个月",
    "cooperation_date": "2026-07-20",
    "status": "active",
}
s, b = req("POST", f"/orders/convert/{opp_id}", conv, token=admin)
check("测试转正式订单", s == 200, b[:80])
if s == 200:
    o = json.loads(b)
    check("  映射: 实际使用方=公司名称", o["actual_user"] == "测试科技有限公司", o["actual_user"])
    check("  映射: 经办人=测试经办人", o["handler"] == "张三")
    check("  映射: 联系电话=测试电话", o["contact_phone"] == "13800000000")
    check("  映射: 安装地址=测试安装地址", o["install_address"] == "上海市浦东新区xx路1号")
    check("  付款日默认=合作日期", str(o["next_payment_date"]) == "2026-07-20", str(o["next_payment_date"]))
    check("  归属人=提交销售", o["owner_id"] is not None)
    order_id = o["id"]
else:
    order_id = None

# 9. sales 看订单（归属自己）
s, b = req("GET", "/orders", token=sales)
check("sales 能看到自己的订单", s == 200 and any(o["id"] == order_id for o in json.loads(b)) if order_id else s == 200)

# 10. sales 不能新建订单 -> 403
s, b = req("POST", "/orders", {"owner_id": 3, "monthly_rent": 1}, token=sales)
check("sales 不能新建订单(403)", s == 403)

# 11. sales 不能编辑订单 -> 403
if order_id:
    s, b = req("PUT", f"/orders/{order_id}", {"monthly_rent": 9999}, token=sales)
    check("sales 不能编辑订单(403)", s == 403)

# 12. 看板
s, b = req("GET", "/dashboard?month=2026-07", token=sales)
check("看板可访问(全员)", s == 200)
if s == 200:
    d = json.loads(b)
    check("  月度订单量>=1", d["total_orders"] >= 1, f"={d['total_orders']}")
    check("  月度业绩>0", d["total_performance"] >= 5000, f"={d['total_performance']}")
    check("  销售排行含销售员", any(r["name"] == "销售员" for r in d["ranking"]))

# 13. 未登录访问 -> 401
s, b = req("GET", "/opportunities")
check("未登录401", s == 401)

print("\nSMOKE DONE")
