# 翼嘉通讯 · 天耘科技 ERP（MVP）

经销商（翼嘉通讯）提交 SD-WAN 专线测试需求，天耘科技（管理员）接收、审核并转为正式订单的简易 ERP。

## 技术栈

- 后端：FastAPI + SQLAlchemy + SQLite（单文件数据库，零运维）
- 前端：Vue 3 + Vite + Element Plus（管理后台界面，中文）
- 鉴权：自签名 Token（7 天有效期）+ PBKDF2 密码哈希
- 部署：前后端单容器，FastAPI 同时托管 API 与构建后的前端静态文件

## 目录结构

```
yijiaERP/
├── backend/
│   ├── run.py              # 启动器（自动注入依赖路径）
│   ├── app/
│   │   ├── main.py         # 应用入口 / 静态托管 / 路由汇总
│   │   ├── database.py     # SQLite 连接与会话
│   │   ├── models.py       # 数据模型：User / Product / Opportunity / Order
│   │   ├── auth.py         # 密码哈希 + Token
│   │   ├── deps.py         # 登录用户 / 角色权限依赖
│   │   ├── schemas.py      # 请求/响应模型
│   │   ├── seed.py         # 初始化演示账号与产品
│   │   └── routers/        # auth / opportunities / orders / dashboard / settings / upload
│   ├── localpkgs/          # 后端依赖（pip --target 安装）
│   └── requirements.txt
├── frontend/
│   ├── src/views/          # Login / Layout / Home / Opportunities / Orders / Settings
│   └── ...
├── data/app.db             # SQLite 数据库（运行时生成）
├── uploads/                # 上传的图片（运行时生成）
└── README.md
```

## 本地启动

需要：Python 3.12（managed）+ Node 22。

### 1. 后端

```bash
cd backend
# 安装依赖（仅首次）
C:/Users/Admin/.workbuddy/binaries/python/versions/3.12.10/python.exe -m pip install --target ./localpkgs -r requirements.txt
# 启动
C:/Users/Admin/.workbuddy/binaries/python/versions/3.12.10/python.exe run.py
```

后端默认监听 `http://localhost:8000`，首次启动会自动建库并写入演示数据。

### 2. 前端（开发态，可选）

```bash
cd frontend
npm install
npm run dev      # 默认 http://localhost:5173，已配置 /api、/uploads 代理到 8000
```

### 3. 构建并整体运行（推荐）

```bash
cd frontend
npm install
npm run build    # 产物输出到 frontend/dist
```

构建后保持后端运行即可：访问 `http://localhost:8000` 会直接加载前端，`/api/*` 走接口，浏览器路由用 hash 模式刷新不 404。

> 修改后端代码后需重启 `run.py`（managed 启动无热加载）：
> PowerShell 停止 8000 端口进程后重新 `python run.py`。

## 演示账号

| 角色 | 用户名 | 密码 | 权限 |
| --- | --- | --- | --- |
| 管理员（天耘科技） | `admin` | `admin123` | 审核商机、测试转正式订单、编辑/新建订单、管理用户与产品 |
| 销售主管（翼嘉） | `manager` | `manager123` | 提交测试、查看全部订单、审批前修改销售提交的测试 |
| 销售（翼嘉） | `sales` | `sales123` | 提交测试、查看自己的订单、审批前修改自己的测试 |

## 功能对照需求

### 一、测试需求提交（商机）
表单含 11 个字段：公司名称、经办人、电话、安装地址、公司营业执照（图片）、
公司门头照片（图片）、公司办公环境照片（图片）、本地运营商网络、需求带宽、需求国家、访问网站。
提交后管理员在「商机」页收到并可审核（通过/驳回 + 回复）；审批前销售主管可改全部、销售可改自己的。

### 二、订单管理
「销售订单」页包含：签约双方、技术提供方、带宽、月租、合作周期、合作日期、实际使用方、
经办人、联系电话、安装地址、下一个付款日。

### 三、测试转正式
管理员从「已通过」的商机一键转正式订单，自动映射：
测试公司名称→实际使用方、测试经办人→经办人、测试电话→联系电话、测试安装地址→安装地址；
**下一个付款日首次转单时默认等于合作日期**（可取消勾选手动设置）。订单归属默认归提交该商机的销售。

### 四、账号权限
- 管理员：接收测试、改状态、测试转成交、编辑订单、管理后台
- 销售：提交测试、看自己订单
- 销售主管：提交测试、看全部订单、修改销售提交的测试

### 五、销售看板（首页，全员可见）
月度总业绩（本月签约订单月租合计）、月度总订单量、月度商机，以及按本月业绩排名的销售排行；
支持切换月份。

### MVP 四页面
首页（看板） / 商机（提交测试） / 销售订单 / 系统设置（用户、产品、改密码）。

## 部署到你的域名（已接入 Cloudflare 加速）

1. 在一台服务器（如轻量云/VPS）上拉取本仓库，执行上面的「构建并整体运行」。
2. 用进程守护（如 `pm2`、`supervisor` 或系统服务）保活 `python run.py`，监听 8000。
3. 在 Cloudflare 控制台把你的域名 A 记录指向该服务器 IP，并开启代理（橙色云）。
4. SSL：Cloudflare 侧用「灵活」模式即可；若用「完全/严格」需在服务器配置源站证书（或在 8000 前加 Caddy/Nginx 自动申请证书）。
5. 注意：`data/`（数据库）与 `uploads/`（图片）需持久化（部署目录不要每次覆盖）；Cloudflare 免费版单文件上传上限 100MB，图片足够。

## 数据重置

删除 `data/app.db` 与 `uploads/` 后重启后端，会重新生成空库与演示账号。

## 后续可扩展

- 新产品线（系统设置→产品已预留，订单可关联产品）
- 订单导出 Excel、回款记录、付款提醒
- 商机阶段漏斗、合同附件、操作日志
