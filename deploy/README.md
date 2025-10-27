# 部署指南

## 三个站点配置

根据宝塔面板配置：

| 站点 | 域名 | 根目录 | 说明 |
|------|------|--------|------|
| API 后端 | api.aipornsearch.shop | /www/wwwroot/aipornsearch.shop/backend | Node.js 后端服务 |
| 管理后台 | admin.aipornsearch.shop | /www/wwwroot/aipornsearch.shop/frontend/admin.aipornsearch.shop | React 管理界面 |
| 用户端 | aipornsearch.shop | /www/wwwroot/aipornsearch.shop/user-app | React 用户界面 |

## 快速部署（推荐）

在服务器上执行：

```bash
cd /www/wwwroot/aipornsearch.shop
bash deploy/deploy.sh
```

脚本会自动完成：
1. ✅ 拉取最新代码
2. ✅ 更新后端依赖
3. ✅ 重启后端服务
4. ✅ 构建用户端
5. ✅ 构建管理后台
6. ✅ 重载 Nginx

## 手动部署步骤

如果自动脚本失败，可以手动执行：

### 1. 拉取最新代码

```bash
cd /www/wwwroot/aipornsearch.shop
git pull origin main
```

### 2. 部署后端（API）

```bash
cd /www/wwwroot/aipornsearch.shop/backend

# 更新依赖
npm ci --production

# 重启服务（选择其中一种方式）
# 方式1: 使用 PM2
pm2 restart backend

# 方式2: 使用宝塔面板
# 在宝塔面板 -> Node项目 -> 重启

# 方式3: 使用 systemd
sudo systemctl restart ai-video-backend
```

### 3. 部署用户端（aipornsearch.shop）

```bash
cd /www/wwwroot/aipornsearch.shop/user-app

# 安装依赖
npm ci

# 构建
npm run build

# 构建产物会自动生成到 dist 目录
# 宝塔面板已配置站点根目录为 user-app，无需额外操作
```

### 4. 部署管理后台（admin.aipornsearch.shop）

```bash
cd /www/wwwroot/aipornsearch.shop/frontend

# 安装依赖
npm ci

# 构建
npm run build

# 复制构建产物到宝塔站点根目录
rm -rf admin.aipornsearch.shop
cp -r dist admin.aipornsearch.shop
```

### 5. 重载 Nginx

```bash
sudo nginx -t
sudo nginx -s reload
```

## 验证部署

### 1. 检查后端服务

```bash
# 检查后端是否运行
curl http://localhost:8000/api/health

# 查看后端日志
pm2 logs backend
# 或
journalctl -u ai-video-backend -f
```

### 2. 访问站点

- **用户端**: http://aipornsearch.shop
  - ✅ 首页应正常加载，无"服务不可用"错误
  - ✅ 轮播图正常显示
  - ✅ 评价飘屏单条循环播放
  
- **管理后台**: http://admin.aipornsearch.shop
  - ✅ 登录页面正常显示
  
- **API 后端**: http://api.aipornsearch.shop/api/health
  - ✅ 返回健康检查信息

### 3. 测试支付功能

1. 上传图片
2. 选择套餐
3. 查看支付弹窗
4. ✅ 二维码应只显示钱包地址（不包含复杂 URI）
5. ✅ 显示"到账检测需要 2-5 分钟"提示
6. 扫码测试钱包兼容性

## 常见问题

### Q1: 构建失败，提示内存不足

```bash
# 增加 Node.js 内存限制
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### Q2: 后端无法启动

```bash
# 检查端口占用
lsof -i :8000

# 检查环境变量
cd /www/wwwroot/aipornsearch.shop/backend
cat .env

# 检查数据库连接
npx prisma db push
```

### Q3: Nginx 配置错误

```bash
# 测试配置
sudo nginx -t

# 查看错误日志
sudo tail -f /var/log/nginx/error.log
```

### Q4: 前端显示空白页

```bash
# 检查构建产物
ls -la /www/wwwroot/aipornsearch.shop/user-app/dist
ls -la /www/wwwroot/aipornsearch.shop/frontend/admin.aipornsearch.shop

# 检查浏览器控制台错误
# F12 -> Console
```

## 回滚到上一个版本

```bash
cd /www/wwwroot/aipornsearch.shop

# 查看提交历史
git log --oneline -5

# 回滚到上一个提交
git reset --hard HEAD~1

# 重新部署
bash deploy/deploy.sh
```

## 本次更新内容

**Commit**: `40eaec7`

### 修复内容

1. ✅ 修复首页"服务不可用"错误
   - 修复 `filterByLanguage` 函数未定义问题
   
2. ✅ 修复支付二维码兼容性
   - 二维码现在只显示纯钱包地址
   - 兼容所有主流钱包

### 影响文件

- `user-app/src/components/SearchApp.jsx`

## 技术支持

如遇问题，请检查：
1. Git 提交历史：`git log --oneline -3`
2. 后端日志：`pm2 logs backend`
3. Nginx 日志：`tail -f /var/log/nginx/error.log`
4. 浏览器控制台：F12 -> Console

