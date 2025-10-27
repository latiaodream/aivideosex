# 部署手册（宝塔 + MySQL 5.7）

本文档记录 `aipornsearch.shop` 项目在生产环境的部署流程，假设服务器已安装宝塔面板。

## 1. 环境准备

1. 登录宝塔 → 软件商店安装组件：
   - Nginx
   - MySQL 5.7
   - Node.js 18（自带 npm、PM2）
2. SSH 进入服务器，创建目录：
   ```bash
   mkdir -p /www/wwwroot/aipornsearch-shop
   ```
3. 上传项目压缩包，解压到上述目录，保留 `backend/`、`frontend/`、`user-app/`。

## 2. 配置 MySQL

1. 在宝塔 MySQL 中新建数据库与账号（按需修改凭据）：
   - 数据库：`aipornsearch_sho`
   - 用户名：`aipornsearch_sho`
   - 密码：`ERTNjZNhaxaApmyG`
2. 授予全部权限，确保本机可访问。

## 3. 后端（Express + Prisma）

```bash
cd /www/wwwroot/aipornsearch-shop/backend
npm install --production
cp .env.example .env
```

编辑 `.env`，确认 `DATABASE_URL` 指向 MySQL，并按需填写支付地址、BscScan Key 等。

初始化数据库（首次部署）：
```bash
npx prisma db push
npx prisma generate
```

使用 PM2 运行：
```bash
pm2 start src/server.js --name aipornsearch-backend
pm2 save
```

日志查看：`pm2 logs aipornsearch-backend`

## 4. 管理后台（frontend）

```bash
cd /www/wwwroot/aipornsearch-shop/frontend
npm install
npm run build
```
生成的 `dist/` 用于 Nginx 静态托管。

## 5. 用户端（user-app）

```bash
cd /www/wwwroot/aipornsearch-shop/user-app
npm install
npm run build
```
同样生成 `dist/`，供前台域名使用。

## 6. Nginx 配置方案

仓库提供了三个模板（`deploy/nginx/*.conf`），可以根据需要选择：

1. **两站点模式（推荐）**
   - `aipornsearch.shop`：前台静态站点，反向代理 `/api/`、`/uploads/` 到 `127.0.0.1:8000`
   - `admin.aipornsearch.shop`：管理后台静态站点，同样代理到本地后端
   - 两个站点都需添加 `/.well-known/acme-challenge/` 方便申请 SSL

2. **三站点模式（可选）**
   - 额外创建 `api.aipornsearch.shop`，仅做后端反向代理，其它站点可以直接访问 `https://api.aipornsearch.shop`

将模板复制到宝塔站点配置后，按实际路径调整 `root`。
申请证书时确保 `/.well-known/acme-challenge/` 保持文件验证通路，证书签发后再开启强制 HTTPS。

## 7. 支付监听

- `.env` 或 `settings` 表中配置 `PAY_TRON_ADDRESSES`, `PAY_BSC_ADDRESSES`, `BSCSCAN_API_KEY`。
- 监听器默认 20s 轮询，匹配金额后一键将订单状态改为 `credited` 并发放积分。

## 8. 常用命令

```bash
# 查看 PM2 进程
pm2 list

# 重启后端
pm2 restart aipornsearch-backend

# 持久化 PM2
pm2 save
pm2 startup   # 按提示执行
```

建议在宝塔计划任务中定期备份 MySQL 数据库和 `/uploads` 目录。
