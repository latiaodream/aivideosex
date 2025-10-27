# AI视频搜索系统 - 后台管理端

一个基于Node.js + React的现代化AI视频搜索系统后台管理平台，支持会员管理、套餐管理、订单管理、评价管理和首页DIY功能。

## 🚀 核心功能

### 1. 会员管理
- **基于IP自动注册**：根据用户IP自动生成账号，支持同网关多用户
- **用户信息管理**：注册设备、国家、登录记录、积分余额等
- **积分系统**：支持积分调整，消费记录追踪
- **状态管理**：正常/封禁状态切换

### 2. 付费套餐管理
- **四档套餐**：高级版(10U)、超级版(20U)、终极版(30U)、至尊版(50U)
- **多语言支持**：套餐名称支持中英文
- **自定义文案**：付费后提示语、升级引导语可编辑
- **排序管理**：支持拖拽排序和上下架

### 3. 订单管理
- **USDT支付支持**：TRC20/BSC/ERC20三条链路
- **状态流转**：pending → seen → confirmed → credited | failed | expired
- **手动处理**：支持手动标记已付、设为过期
- **详细记录**：交易哈希、确认数、收付地址等完整信息

### 4. 评价管理
- **来源分类**：demo/beta/real三种来源，带角标展示
- **验证系统**：已验证购买徽章，可关联订单
- **多语言内容**：支持中英文评价内容
- **发布控制**：草稿/已发布/未列出状态管理

### 5. 首页DIY
- **轮播图管理**：图片、标题、描述、CTA按钮配置
- **文本区块**：标题、副标题、要点列表编辑
- **价格表展示**：实时读取套餐数据展示

## 🛠️ 技术栈

### 后端
- **Node.js + Express**：服务端框架
- **Prisma ORM**：数据库操作
- **SQLite/MySQL**：数据库支持
- **Swagger**：API文档自动生成
- **JWT/Cookie**：用户会话管理

### 前端
- **React 18 + Vite**：现代化前端框架
- **Ant Design 5**：UI组件库（移动端优化）
- **React Router v6**：路由管理
- **React i18next**：国际化支持
- **Axios**：HTTP客户端

## 📱 移动端优化

- **响应式设计**：完美适配手机、平板、桌面端
- **移动端导航**：侧边抽屉菜单，触摸友好
- **表格滚动**：移动端表格横向滚动优化
- **表单优化**：移动端表单布局和交互优化

## 🌍 多语言支持

支持6种语言：
- 简体中文 (zh-CN)
- 英语 (en-US)
- 西班牙语 (es-ES)
- 日语 (ja-JP)
- 韩语 (ko-KR)
- 葡萄牙语 (pt-PT)

## 📦 快速开始

### 环境要求
- Node.js >= 18.0
- npm >= 8.0

### 1. 安装依赖

```bash
# 后端依赖
cd backend
npm install

# 前端依赖  
cd ../frontend
npm install --legacy-peer-deps
```

### 2. 环境配置

复制环境配置文件并填写 MySQL 连接：
```bash
cd backend
cp .env.example .env
```

`.env` 示例（MySQL 5.7/8.x）：
```env
DATABASE_URL="mysql://user:password@127.0.0.1:3306/ai_video_search"
ADMIN_TOKEN="your_secure_admin_token_here"
IP_SALT="your_unique_salt_for_ip_hash"
PAY_TRON_ADDRESSES="TRON_ADDRESS_1,TRON_ADDRESS_2"
PAY_BSC_ADDRESSES="BSC_ADDRESS_1,BSC_ADDRESS_2"
BSCSCAN_API_KEY="your_bscscan_api_key"
PORT=8000
NODE_ENV=production
```

### 3. 数据库设置

```bash
cd backend

# 将 Prisma schema 同步到数据库（首次部署）
npx prisma db push

# 如需本地测试数据，可执行（生产环境请勿运行）
node src/seed.js
```

### 4. 启动服务

```bash
# 启动后端服务 (端口8000)
cd backend
npm run dev

# 启动管理端服务 (端口5177)
cd frontend
npm run dev

# 启动用户端服务 (端口5174)
cd user-app
npm run dev
```

### 5. 访问系统

- **管理后台**: http://localhost:5177
- **API文档**: http://localhost:8000/api/docs
- **健康检查**: http://localhost:8000/api/health

**默认登录信息**：
- 管理员Token: `admin_token_2024_dev`

## 📊 种子数据说明

系统自动生成测试数据：

### 用户数据 (10个用户)
- 包含3个相同网关用户（相同ipHash）
- 覆盖不同国家、设备类型
- 不同状态：正常/封禁
- 不同消费记录和积分余额

### 套餐数据 (4个套餐)
```
高级版: 10 USDT / 100积分
超级版: 20 USDT / 250积分  
终极版: 30 USDT / 400积分
至尊版: 50 USDT / 700积分
```

### 订单数据 (20个订单)
- 覆盖所有订单状态
- 不同支付链路 (TRON/BSC/ETH)
- 包含成功、失败、过期等案例

### 评价数据 (6条评价)
- demo/beta/real 各2条
- 包含已验证和未验证案例
- 中英文内容示例

### 首页内容
- 3个轮播图
- 2个文本区块
- 完整的多语言内容

## 🔧 开发指南

### 项目结构
```
ai-video-search/
├── backend/              # 后端代码
│   ├── prisma/          # 数据库Schema和迁移
│   ├── src/             # 源代码
│   │   ├── routes/      # API路由
│   │   ├── utils/       # 工具函数
│   │   ├── server.js    # 服务入口
│   │   └── seed.js      # 种子数据
│   └── package.json
├── frontend/            # 前端代码
│   ├── src/
│   │   ├── components/  # React组件
│   │   ├── pages/       # 页面组件
│   │   ├── locales/     # 多语言文件
│   │   ├── utils/       # 工具函数
│   │   └── App.jsx      # 应用入口
│   └── package.json
└── README.md           # 项目文档
```

### API接口

#### 认证相关
- `POST /api/public/auth/auto` - IP自动注册

#### 用户管理
- `GET /api/admin/users` - 获取用户列表
- `GET /api/admin/users/:id` - 获取用户详情
- `PATCH /api/admin/users/:id` - 更新用户信息
- `POST /api/admin/users/:id/credit/adjust` - 调整积分

#### 套餐管理
- `GET /api/admin/plans` - 获取套餐列表
- `POST /api/admin/plans` - 创建套餐
- `PATCH /api/admin/plans/:id` - 更新套餐
- `PATCH /api/admin/plans/sort` - 批量排序

#### 订单管理
- `GET /api/admin/orders` - 获取订单列表
- `GET /api/admin/orders/:id` - 获取订单详情
- `POST /api/admin/orders/:id/mark-paid` - 标记已付
- `POST /api/admin/orders/:id/expire` - 设为过期

#### 评价管理
- `GET /api/admin/reviews` - 获取评价列表
- `POST /api/admin/reviews` - 创建评价
- `PATCH /api/admin/reviews/:id` - 更新评价
- `DELETE /api/admin/reviews/:id` - 删除评价

#### 首页管理
- `GET /api/admin/banners` - 获取轮播图
- `POST /api/admin/banners` - 创建轮播图
- `GET /api/admin/text-blocks` - 获取文本区块
- `POST /api/admin/text-blocks` - 创建文本区块

### 构建部署

```bash
# 构建前端
cd frontend
npm run build

# 后端生产启动
cd backend
npm run start
```

## 🔒 安全特性

- **Token认证**：管理员访问需要有效Token
- **输入验证**：所有输入进行严格验证
- **SQL注入防护**：使用Prisma ORM参数化查询
- **跨域保护**：CORS配置防止未授权访问
- **IP隐私保护**：注册IP显示时自动打码

## 📝 自动注册机制

系统基于用户IP实现自动注册：

1. **IP识别**：获取真实客户端IP（支持代理）
2. **哈希生成**：IP+盐值生成10位哈希
3. **账号生成**：格式为 `u_{ipHash}_{YYMMDD}[-n]`
4. **幂等性**：相同IP当天重复访问返回相同账号
5. **多用户支持**：同网关多用户自动递增后缀

## 🧪 测试

```bash
# 后端测试
cd backend
npm test

# 前端测试
cd frontend  
npm test

# API测试
curl http://localhost:8000/api/health
```

## 📋 TODO

- [ ] 完善所有管理页面的完整CRUD功能
- [ ] 添加数据导出功能
- [ ] 实现实时统计Dashboard
- [ ] 添加批量操作功能
- [ ] 集成第三方支付SDK
- [ ] 添加操作日志记录
- [ ] 实现数据备份恢复
- [ ] 添加单元测试和集成测试

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request来帮助改进项目。

---

**技术支持**: 如遇问题请提交Issue或联系开发团队。
