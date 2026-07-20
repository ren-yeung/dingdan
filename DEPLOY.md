# 部署指南（Cloudflare 原生：Pages + Functions + D1 + R2）

本项目已重写为 Cloudflare 原生架构，可随 GitHub 推送自动部署，关机后网站照常可访问。

- **前端**：Vue 3 + Vite + Element Plus，构建产物为静态文件（`frontend/dist`）。
- **后端**：Cloudflare Pages Functions（`functions/` 下 Hono 应用），无服务器、随请求冷启动。
- **数据库**：Cloudflare D1（托管 SQLite），首次访问自动建表并写入演示账号。
- **图片存储**：Cloudflare R2（对象存储），上传的营业执照/门头/办公照片存这里。

> 整个站点跑在 Cloudflare 边缘，不需要你自己的服务器常开。

---

## 一、前置条件

1. GitHub 仓库：`https://github.com/ren-yeung/dingdan`（空白仓库，代码推送后由 Cloudflare 抓取）。
2. Cloudflare 账号：已用 GitHub 授权登录，且域名 `dingdan.ccwu.cc` 的 DNS 托管在 Cloudflare（否则自定义域名无法自动签发 SSL）。

---

## 二、一次性配置（Cloudflare 控制台）

### 1. 创建 D1 数据库

- 进入 **Workers & Pages → D1**。
- 新建数据库，名称填 **`yijia-erp-db`**（名称可自定义，但下方绑定要对应）。
- 记下它的 **Database ID**（后面可选，绑定用名称即可）。

### 2. 创建 R2 桶

- 进入 **R2 → 创建桶**，名称填 **`yijia-erp-uploads`**。
- 区域默认即可。

### 3. 创建 Pages 项目并绑定 GitHub

- 进入 **Workers & Pages → 创建 → Pages → 连接到 Git**。
- 选仓库 **`ren-yeung/dingdan`**，分支 `master`（或 `main`）。
- 构建设置：
  - **构建命令（Build command）**：`npm run build`
  - **构建输出目录（Build output directory）**：`frontend/dist`
- 进入项目 **设置 → 函数 → 兼容性日期**：保持较新（如 `2024-11-01` 或更新）。

### 4. 绑定 D1 / R2 / 变量

在项目 **设置 → 函数（Functions）** 中：

- **D1 数据库绑定**：变量名 `DB`，绑定到 `yijia-erp-db`。
- **R2 桶绑定**：变量名 `BUCKET`，绑定到 `yijia-erp-uploads`。
- **环境变量（Variables）**：新增 `JWT_SECRET`，值用一条随机长字符串，例如本地执行：
  ```bash
  openssl rand -hex 32
  ```
  把输出粘进去。**务必设为「加密(Encrypt)」**，不要明文提交到仓库。

> 变量名 `DB` / `BUCKET` / `JWT_SECRET` 必须与 `functions/` 代码里的 `c.env.DB`、`c.env.BUCKET`、`env.JWT_SECRET` 完全一致。

### 5. 绑定自定义域名

- 进入项目 **设置 → 自定义域（Custom domains）**，添加 **`dingdan.ccwu.cc`**。
- Cloudflare 会自动添加 DNS 记录并签发 SSL 证书（通常 1–2 分钟）。
- 若提示需要把域名 NS 转到 Cloudflare，请先在域名注册商处把 NS 改为 Cloudflare 提供的地址。

---

## 三、推送代码 → 自动部署

绑定 GitHub 后，每次 `git push` 到 `master` 都会触发一次构建与发布：

```bash
git add -A
git commit -m "Cloudflare 原生重写"
git push origin master
```

构建日志在 Cloudflare 项目 **部署（Deployments）** 页可见。成功后访问 `https://dingdan.ccwu.cc` 即可。

> 若构建失败，先看部署日志：常见原因是构建命令/输出目录填错，或 D1/R2 绑定变量名不一致。

---

## 四、本地开发（可选）

需要 Node 22（managed）。后端用 Miniflare 模拟 D1/R2，前端由 Pages 静态托管。

```bash
# 安装依赖
npm install
# 启动（默认 http://localhost:8788，含前端 + 接口）
npm run dev
```

- 健康检查：`http://localhost:8788/api/health`
- 数据库/桶在本地为模拟状态，重启用会被重置；演示账号会在首次访问时自动写入。

---

## 五、演示账号（首次部署后自动创建）

| 角色 | 用户名 | 密码 | 权限 |
| --- | --- | --- | --- |
| 管理员（天耘科技） | `admin` | `admin123` | 审核商机、测试转正式订单、编辑/新建订单、管理用户与产品 |
| 销售主管（翼嘉） | `manager` | `manager123` | 提交测试、查看全部订单、审批前修改销售提交的测试 |
| 销售（翼嘉） | `sales` | `sales123` | 提交测试、查看自己的订单、审批前修改自己的测试 |

> 上线后请到「系统设置 → 用户」修改默认密码，或直接在 D1 控制台执行 UPDATE。

---

## 六、与旧版（FastAPI）的区别

| 项目 | 旧版 | Cloudflare 原生版 |
| --- | --- | --- |
| 运行位置 | 你自己的服务器（常开） | Cloudflare 边缘（关机不影响） |
| 数据库 | 本地 SQLite 文件 | D1（托管 SQLite） |
| 图片 | 本地 `uploads/` 目录 | R2 对象存储 |
| 部署 | 手动跑 `python run.py` + 守护进程 | `git push` 自动构建发布 |
| 自定义域名 | A 记录 + 代理 | Pages 自定义域自动 SSL |

数据不互通：旧库 `data/app.db` 不会自动迁移到 D1，需在新站点重新录入（或手工导出 SQL 导入 D1）。
