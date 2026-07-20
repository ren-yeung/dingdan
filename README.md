# 翼嘉通讯 · 天耘科技 ERP（Cloudflare 原生版）

经销商（翼嘉通讯）提交 SD-WAN 专线测试需求，天耘科技（管理员）接收、审核并转为正式订单的简易 ERP。
整套系统运行在 Cloudflare 上，**关机后网站照常可访问**，代码推送到 GitHub 即自动部署。

## 技术栈

- 前端：Vue 3 + Vite + Element Plus（中文管理后台）
- 后端：Cloudflare Pages Functions + Hono（无服务器，随请求运行）
- 数据库：Cloudflare D1（托管 SQLite，自动建表 + 写入演示数据）
- 图片存储：Cloudflare R2（对象存储）
- 鉴权：HMAC 自签名 Token + Web Crypto PBKDF2 密码哈希（无第三方依赖）

## 目录结构

```
yijiaERP/
├── functions/                 # Cloudflare Pages Functions（后端）
│   ├── api/[[path]].js        # 所有 /api/* 路由（Hono 应用）
│   ├── uploads/[key].js       # 从 R2 回源图片
│   └── lib/                   # crypto（哈希/签名）、db（D1 封装 + 建表/种子）
├── frontend/                  # Vue 3 前端（npm run build → dist）
├── migrations/0001_init.sql   # 参考用建表语句
├── wrangler.toml              # 本地开发/CLI 部署配置（D1/R2/JWT_SECRET 绑定）
├── package.json               # 根：dev / build / deploy 脚本
└── DEPLOY.md                  # 部署到 Cloudflare + 自定义域名指南
```

## 本地启动

需要 Node 22（managed）。

```bash
npm install
npm run dev        # 启动 Pages 开发服务器，默认 http://localhost:8788
```

- 前端与接口同源：`/api/*` 即函数，`/uploads/*` 即 R2 图片。
- 首次访问 `/api/health` 会自动建表并写入演示账号；本地 D1/R2 为模拟状态，重启会重置。
- 构建静态产物：`npm run build`（等价于 `npm --prefix frontend install && npm --prefix frontend run build`），产物输出到 `frontend/dist`。

## 部署到域名

见 **[DEPLOY.md](./DEPLOY.md)**：创建 D1 库 `yijia-erp-db`、R2 桶 `yijia-erp-uploads`，
在 Cloudflare Pages 绑定 GitHub 仓库 `ren-yeung/dingdan`，构建命令 `npm run build`、输出目录 `frontend/dist`，
设置 `JWT_SECRET` 环境变量并绑定自定义域 `dingdan.ccwu.cc`，然后 `git push` 即自动上线。

## 演示账号（首次部署后自动创建）

| 角色 | 用户名 | 密码 | 权限 |
| --- | --- | --- | --- |
| 管理员（天耘科技） | `admin` | `admin123` | 审核商机、测试转正式订单、编辑/新建订单、管理用户与产品 |
| 销售主管（翼嘉） | `manager` | `manager123` | 提交测试、查看全部订单、审批前修改销售提交的测试 |
| 销售（翼嘉） | `sales` | `sales123` | 提交测试、查看自己的订单、审批前修改自己的测试 |

## 功能对照

### 一、测试需求提交（商机）
表单 11 字段：公司名称、经办人、电话、安装地址、营业执照（图）、门头照片（图）、
办公环境照片（图）、本地运营商、需求带宽、需求国家、访问网站。
管理员在「商机」页审核（通过/驳回 + 回复）；审批前销售主管可改全部、销售可改自己的。

### 二、订单管理
「销售订单」页：甲方、乙方、技术提供方、带宽、月租、合作周期、合作日期、实际使用方、
经办人、联系电话、安装地址、下一个付款日、归属销售、状态。

### 三、测试转正式
管理员从「已通过」商机一键转正式订单，自动映射：
公司名称→实际使用方、经办人→经办人、电话→联系电话、安装地址→安装地址、国家→合作国家；
下一个付款日默认等于合作日期；订单归属默认归提交该商机的销售。

### 四、账号权限
- 管理员：接收测试、改状态、测试转成交、编辑订单、管理后台
- 销售：提交测试、看自己订单
- 销售主管：提交测试、看全部订单、修改销售提交的测试

### 五、销售看板（首页，全员可见）
月度总业绩（本月签约订单月租合计）、月度总订单量、月度商机，按本月业绩排名的销售排行；支持切换月份。
首页含「最近商机」「最近订单」两个板块。

## MVP 四页面
首页（看板） / 商机（提交测试） / 销售订单 / 系统设置（用户、产品、改密码）。

## 后续可扩展
- 新产品线、订单导出 Excel、回款记录、付款提醒
- 商机阶段漏斗、合同附件、操作日志
