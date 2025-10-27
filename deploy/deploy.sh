#!/bin/bash

# AI Video Search 三站点部署脚本
# 用途：拉取最新代码并部署到三个站点
# 使用方法：bash deploy/deploy.sh

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置变量
PROJECT_ROOT="/www/wwwroot/aipornsearch.shop"
BACKEND_PORT=8000

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}AI Video Search 部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 1. 检查目录是否存在
if [ ! -d "$PROJECT_ROOT" ]; then
    echo -e "${RED}错误: 项目目录不存在: $PROJECT_ROOT${NC}"
    exit 1
fi

cd "$PROJECT_ROOT"
echo -e "${YELLOW}当前目录: $(pwd)${NC}"
echo ""

# 2. 拉取最新代码
echo -e "${GREEN}[1/6] 拉取最新代码...${NC}"
git fetch origin
git pull origin main
echo -e "${GREEN}✓ 代码更新完成${NC}"
echo ""

# 3. 更新后端依赖并重启
echo -e "${GREEN}[2/6] 更新后端依赖...${NC}"
cd backend
npm ci --production
echo -e "${GREEN}✓ 后端依赖更新完成${NC}"
echo ""

echo -e "${GREEN}[3/6] 重启后端服务...${NC}"
# 检查是否使用 PM2
if command -v pm2 &> /dev/null; then
    echo "使用 PM2 重启后端..."
    pm2 restart backend || pm2 start src/server.js --name backend
    pm2 save
    echo -e "${GREEN}✓ 后端服务已通过 PM2 重启${NC}"
else
    echo "未检测到 PM2，尝试使用 systemd..."
    if systemctl is-active --quiet ai-video-backend; then
        sudo systemctl restart ai-video-backend
        echo -e "${GREEN}✓ 后端服务已通过 systemd 重启${NC}"
    else
        echo -e "${YELLOW}警告: 未找到后端服务管理器，请手动重启后端${NC}"
        echo -e "${YELLOW}手动重启命令: cd $PROJECT_ROOT/backend && npm start${NC}"
    fi
fi
echo ""

# 4. 构建用户端
echo -e "${GREEN}[4/6] 构建用户端 (user-app)...${NC}"
cd "$PROJECT_ROOT/user-app"
npm ci
npm run build
# 用户端直接构建到 user-app 目录（宝塔面板配置的根目录）
echo -e "${GREEN}✓ 用户端构建完成${NC}"
echo -e "${YELLOW}部署路径: $PROJECT_ROOT/user-app (宝塔站点根目录)${NC}"
echo ""

# 5. 构建管理后台
echo -e "${GREEN}[5/6] 构建管理后台 (frontend)...${NC}"
cd "$PROJECT_ROOT/frontend"
npm ci
npm run build
# 复制构建产物到宝塔站点根目录
if [ -d "$PROJECT_ROOT/frontend/admin.aipornsearch.shop" ]; then
    rm -rf "$PROJECT_ROOT/frontend/admin.aipornsearch.shop"
fi
cp -r dist "$PROJECT_ROOT/frontend/admin.aipornsearch.shop"
echo -e "${GREEN}✓ 管理后台构建完成${NC}"
echo -e "${YELLOW}部署路径: $PROJECT_ROOT/frontend/admin.aipornsearch.shop (宝塔站点根目录)${NC}"
echo ""

# 6. 重载 Nginx
echo -e "${GREEN}[6/6] 重载 Nginx 配置...${NC}"
if command -v nginx &> /dev/null; then
    sudo nginx -t && sudo nginx -s reload
    echo -e "${GREEN}✓ Nginx 配置已重载${NC}"
else
    echo -e "${YELLOW}警告: 未检测到 Nginx，跳过重载${NC}"
fi
echo ""

# 7. 显示部署结果
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}站点访问地址:${NC}"
echo -e "  用户端:     http://aipornsearch.shop"
echo -e "  管理后台:   http://admin.aipornsearch.shop"
echo -e "  API 后端:   http://api.aipornsearch.shop"
echo ""
echo -e "${YELLOW}验证步骤:${NC}"
echo -e "  1. 访问用户端，检查首页是否正常加载"
echo -e "  2. 上传图片，测试支付二维码是否只显示地址"
echo -e "  3. 检查西班牙语评价飘屏是否单条循环播放"
echo -e "  4. 测试支付到账速度（应在几秒内检测到）"
echo ""
echo -e "${YELLOW}查看日志:${NC}"
if command -v pm2 &> /dev/null; then
    echo -e "  后端日志: pm2 logs backend"
else
    echo -e "  后端日志: journalctl -u ai-video-backend -f"
fi
echo ""
echo -e "${GREEN}部署脚本执行完毕！${NC}"

