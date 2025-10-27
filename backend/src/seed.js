const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const dayjs = require('dayjs');

const prisma = new PrismaClient();

// 生成IP Hash的辅助函数
function generateIpHash(ip) {
  const salt = process.env.IP_SALT || 'unique_salt_for_ip_hash_2024';
  return crypto
    .createHash('sha256')
    .update(ip + salt)
    .digest('hex')
    .slice(0, 10);
}

// 生成随机订单号
function generateOrderNo() {
  return 'ORD' + Date.now() + Math.random().toString(36).substr(2, 4).toUpperCase();
}

async function main() {
  console.log('🌱 开始种子数据生成...');

  // 清空现有数据
  console.log('🧹 清理现有数据...');
  await prisma.order.deleteMany();
  await prisma.review.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.textBlock.deleteMany();
  await prisma.user.deleteMany();
  await prisma.plan.deleteMany();

  // 1. 创建4个套餐
  console.log('📦 创建4个付费套餐...');
  const plans = await Promise.all([
    prisma.plan.create({
      data: {
        code: 'ADV',
        name_zh: '高级版',
        name_en: 'Advanced',
        priceUSDT: 10,
        creditGrant: 100,
        sort: 1,
        isActive: true,
        postpay_zh: '已完成基础匹配。如结果不理想，建议上传更清晰图片或升级【超级版】。',
        postpay_en: 'Basic matching completed. If results are not ideal, consider uploading clearer images or upgrading to Super version.',
        upsell_zh: '想要更高命中率？试试【超级版】。',
        upsell_en: 'Want higher hit rates? Try the Super version.',
        afterPay_zh: JSON.stringify({
          title: '🎯 基础匹配完成',
          subtitle: '如果结果一般，建议上传更清晰图片，或升级【超级版】',
          text: '基础引擎已返回结果。升级可获得更高命中率与更多匹配。',
          bullets: ['更高命中率', '更多结果', '更快返回'],
          nextUpsell: { show: true }
        }),
        afterPay_en: JSON.stringify({
          title: '🎯 Basic Matching Completed',
          subtitle: 'If results are not ideal, try clearer images or upgrade to Super',
          text: 'Upgrade for higher hit rates and more results.',
          bullets: ['Higher hit rate', 'More results', 'Faster returns'],
          nextUpsell: { show: true }
        })
      }
    }),
    prisma.plan.create({
      data: {
        code: 'SUP',
        name_zh: '超级版',
        name_en: 'Super',
        priceUSDT: 20,
        creditGrant: 250,
        sort: 2,
        isActive: true,
        postpay_zh: '高精度引擎已运行，正在比对更多素材源。若仍未命中，可升级【终极版】开启深度多模态检索。',
        postpay_en: 'High-precision engine is running, comparing more material sources. If still no match, upgrade to Ultimate for deep multimodal retrieval.',
        upsell_zh: '需要更强场景理解与相似度召回？升级【终极版】。',
        upsell_en: 'Need stronger scene understanding and similarity recall? Upgrade to Ultimate.',
        afterPay_zh: JSON.stringify({
          title: '⚡ 高级匹配完成',
          subtitle: '还想要更高精度与更多通道？升级【终极版】',
          bullets: ['更强多模态', '更多通道', '更优排序'],
          nextUpsell: { show: true }
        }),
        afterPay_en: JSON.stringify({
          title: '⚡ Super Matching Done',
          subtitle: 'Upgrade to Ultimate for higher precision and more channels',
          bullets: ['Stronger multimodal', 'More channels', 'Better reranking'],
          nextUpsell: { show: true }
        })
      }
    }),
    prisma.plan.create({
      data: {
        code: 'ULT',
        name_zh: '终极版',
        name_en: 'Ultimate',
        priceUSDT: 30,
        creditGrant: 400,
        sort: 3,
        isActive: true,
        postpay_zh: '已启用最优质通道与多模型重排。若还未命中，可升级【至尊版】进入私人定制。',
        postpay_en: 'Premium channels and multi-model reranking enabled. If still no match, upgrade to Supreme for personalized service.',
        upsell_zh: '提交【至尊版】，将有人工辅助与专线检索。',
        upsell_en: 'Submit to Supreme version for manual assistance and dedicated search.',
        afterPay_zh: JSON.stringify({
          title: '💎 终极搜索完成',
          subtitle: '若仍未命中，升级【至尊版】进入私人定制流程',
          bullets: ['人工辅助', '专线检索', '个性化跟进'],
          nextUpsell: { show: true }
        }),
        afterPay_en: JSON.stringify({
          title: '💎 Ultimate Search Completed',
          subtitle: 'Upgrade to Supreme for personalized service if needed',
          bullets: ['Manual assistance', 'Dedicated search', 'Personalized follow-up'],
          nextUpsell: { show: true }
        })
      }
    }),
    prisma.plan.create({
      data: {
        code: 'SUPR',
        name_zh: '至尊版',
        name_en: 'Supreme',
        priceUSDT: 50,
        creditGrant: 700,
        sort: 4,
        isActive: true,
        postpay_zh: '已进入私人定制流程，我们会优先人工复核与回查，预计数分钟内更新结果。',
        postpay_en: 'Entered personalized service process. We will prioritize manual review and recheck, results updated within minutes.',
        upsell_zh: '感谢选择至尊版，享受最高级的服务体验。',
        upsell_en: 'Thank you for choosing Supreme, enjoy the highest level of service experience.',
        afterPay_zh: JSON.stringify({
          title: '👑 已进入私人定制流程',
          subtitle: '我们会优先人工复核与回查，预计数分钟内更新结果',
          bullets: ['优先处理', '人工复核', '专属支持'],
          nextUpsell: { show: false }
        }),
        afterPay_en: JSON.stringify({
          title: '👑 Personalized Flow Started',
          subtitle: 'Manual review and recheck prioritized, results will update soon',
          bullets: ['Priority handling', 'Manual review', 'Dedicated support'],
          nextUpsell: { show: false }
        })
      }
    })
  ]);

  // 2. 创建10个用户（含同网关多账号）
  console.log('👥 创建10个测试用户...');
  const testIps = [
    '192.168.1.100', '192.168.1.101', '192.168.1.102', // 同网关3个用户
    '203.123.45.67', '185.234.56.78', '156.78.90.123',
    '72.14.192.1', '8.8.8.8', '1.1.1.1', '114.114.114.114'
  ];
  
  const countries = ['CN', 'US', 'JP', 'KR', 'MX', 'BR', 'DE', 'FR', 'UK', 'CA'];
  const devices = ['iOS', 'Android', 'Web', 'Web', 'iOS', 'Android', 'Web', 'iOS', 'Android', 'Web'];
  
  const users = [];
  for (let i = 0; i < 10; i++) {
    const ip = testIps[i];
    const ipHash = generateIpHash(ip);
    const today = dayjs().format('YYMMDD');
    
    // 为同网关用户生成递增账号
    let account = `u_${ipHash}_${today}`;
    if (i === 1) account += '-2'; // 第二个用户
    if (i === 2) account += '-3'; // 第三个用户
    
    const user = await prisma.user.create({
      data: {
        account,
        ipHash,
        phone: i < 5 ? `1${Math.floor(Math.random() * 9000000000) + 1000000000}` : null,
        email: i < 3 ? `user${i + 1}@example.com` : null,
        countryCode: countries[i],
        registerIp: ip,
        registerDevice: devices[i],
        registeredAt: dayjs().subtract(Math.floor(Math.random() * 30), 'day').toDate(),
        lastLoginAt: dayjs().subtract(Math.floor(Math.random() * 7), 'day').toDate(),
        lastLoginIp: ip,
        tags: i < 3 ? JSON.stringify(['VIP']) : (i === 8 ? JSON.stringify(['risk']) : null),
        status: i === 9 ? 'banned' : 'active',
        creditBalance: Math.floor(Math.random() * 500) + 10,
        totalSpentUSDT: i < 6 ? Math.floor(Math.random() * 100) + 10 : 0
      }
    });
    users.push(user);
  }

  // 3. 创建20个订单（覆盖所有状态）
  console.log('📋 创建20个测试订单...');
  const statuses = ['pending', 'seen', 'confirmed', 'credited', 'failed', 'expired'];
  const chains = ['TRON', 'BSC', 'ETH'];
  const addresses = [
    'TRhNwNUHfNdUrW7VKbG0b4u8NQrH5CkKzX',
    '0x8ba1f109551bD432803012645Hac136c',
    '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
  ];

  for (let i = 0; i < 20; i++) {
    const user = users[i % users.length];
    const plan = plans[i % plans.length];
    const chain = chains[i % chains.length];
    const status = statuses[i % statuses.length];
    
    const baseData = {
      orderNo: generateOrderNo(),
      userId: user.id,
      planId: plan.id,
      chain,
      token: 'USDT',
      amountDue: plan.priceUSDT,
      toAddress: addresses[i % addresses.length],
      confirmations: 0,
      status,
      createdAt: dayjs().subtract(Math.floor(Math.random() * 15), 'day').toDate(),
      expiresAt: dayjs().add(1, 'hour').toDate()
    };

    // 根据状态添加额外字段
    if (['confirmed', 'credited'].includes(status)) {
      baseData.amountPaid = plan.priceUSDT;
      baseData.txHash = '0x' + crypto.randomBytes(32).toString('hex');
      baseData.fromAddress = '0x' + crypto.randomBytes(20).toString('hex');
      baseData.paidAt = dayjs().subtract(Math.floor(Math.random() * 10), 'day').toDate();
      baseData.confirmations = Math.floor(Math.random() * 20) + 1;
    }

    if (status === 'failed') {
      baseData.amountPaid = plan.priceUSDT * 0.95; // 支付金额不足
      baseData.fromAddress = '0x' + crypto.randomBytes(20).toString('hex');
    }

    if (status === 'expired') {
      baseData.expiresAt = dayjs().subtract(1, 'day').toDate();
    }

    await prisma.order.create({ data: baseData });
  }

  // 4. 创建6个评价（demo/beta/real各2条）
  console.log('⭐ 创建6个测试评价...');
  const reviewsData = [
    // Demo reviews
    {
      displayName: '张三',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhang',
      stars: 5,
      content_zh: '效果超出预期！AI识别准确度很高，找到了我需要的视频。界面简洁易用。',
      content_en: 'Results exceeded expectations! AI recognition accuracy is very high, found the videos I needed. Clean and easy interface.',
      imageUrl: null,
      sourceType: 'demo',
      verified: false,
      language: 'zh-CN',
      status: 'published',
      pinned: true,
      sort: 1
    },
    {
      displayName: 'John Smith',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
      stars: 4,
      content_zh: '系统响应快速，搜索结果相关性强。偶尔会有误匹配，但整体满意。',
      content_en: 'System responds quickly with highly relevant search results. Occasional mismatches but overall satisfied.',
      imageUrl: null,
      sourceType: 'demo',
      verified: false,
      language: 'en-US',
      status: 'published',
      pinned: false,
      sort: 2
    },
    // Beta reviews
    {
      displayName: '李四',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=li',
      stars: 5,
      content_zh: '测试期间体验很棒！多模态搜索功能强大，期待正式版本。',
      content_en: 'Great experience during beta testing! Powerful multimodal search features, looking forward to the official release.',
      imageUrl: null,
      sourceType: 'beta',
      verified: true,
      orderId: null, // Beta用户可能没有关联订单
      language: 'zh-CN',
      status: 'published',
      pinned: false,
      sort: 3
    },
    {
      displayName: 'Maria Garcia',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=maria',
      stars: 4,
      content_zh: '作为测试用户，见证了产品从粗糙到精细的过程。现在已经很实用了。',
      content_en: 'As a beta tester, witnessed the product evolution from rough to refined. Now it is very practical.',
      imageUrl: null,
      sourceType: 'beta',
      verified: true,
      language: 'es-ES',
      status: 'published',
      pinned: false,
      sort: 4
    },
    // Real reviews
    {
      displayName: '王五',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wang',
      stars: 5,
      content_zh: '购买终极版后效果显著提升！客服响应及时，技术团队专业。强烈推荐！',
      content_en: 'Significant improvement after purchasing Ultimate! Timely customer service and professional tech team. Highly recommended!',
      imageUrl: 'https://picsum.photos/400/300?random=1',
      sourceType: 'real',
      verified: true,
      orderId: 1, // 关联真实订单
      language: 'zh-CN',
      status: 'published',
      pinned: true,
      sort: 5
    },
    {
      displayName: 'Alex Johnson',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
      stars: 4,
      content_zh: '性价比高，搜索结果准确。唯一建议是希望增加更多语言支持。',
      content_en: 'Great value for money with accurate search results. Only suggestion is to add more language support.',
      imageUrl: null,
      sourceType: 'real',
      verified: true,
      orderId: 2,
      language: 'en-US',
      status: 'published',
      pinned: false,
      sort: 6
    }
  ];

  for (const reviewData of reviewsData) {
    await prisma.review.create({
      data: {
        ...reviewData,
        createdAt: dayjs().subtract(Math.floor(Math.random() * 20), 'day').toDate()
      }
    });
  }

  // 5. 创建3个轮播图
  console.log('🖼️ 创建3个轮播图...');
  const bannersData = [
    {
      imageUrl: 'https://picsum.photos/800/400?random=banner1',
      altText: '首页轮播图1',
      title_zh: 'AI智能视频搜索',
      title_en: 'AI Intelligent Video Search',
      desc_zh: '革命性的多模态搜索技术，让视频内容触手可及',
      desc_en: 'Revolutionary multimodal search technology making video content accessible',
      ctaText_zh: '立即体验',
      ctaText_en: 'Try Now',
      ctaLink: '/search',
      language: 'zh-CN',
      region: 'CN',
      weight: 100,
      sort: 1,
      status: 'enabled'
    },
    {
      imageUrl: 'https://picsum.photos/800/400?random=banner2',
      altText: 'Homepage Banner 2',
      title_zh: '极速匹配',
      title_en: 'Lightning Fast Matching',
      desc_zh: '毫秒级响应，海量视频库实时检索',
      desc_en: 'Millisecond response with real-time search across massive video libraries',
      ctaText_zh: '了解更多',
      ctaText_en: 'Learn More',
      ctaLink: '/about',
      language: 'en-US',
      region: 'US',
      weight: 90,
      sort: 2,
      status: 'enabled'
    },
    {
      imageUrl: 'https://picsum.photos/800/400?random=banner3',
      altText: '全球服务横幅',
      title_zh: '全球服务',
      title_en: 'Global Service',
      desc_zh: '支持多语言，覆盖全球主要地区',
      desc_en: 'Multi-language support covering major global regions',
      ctaText_zh: '选择套餐',
      ctaText_en: 'Choose Plan',
      ctaLink: '/plans',
      language: 'zh-CN',
      region: null, // 全区域
      weight: 80,
      sort: 3,
      status: 'enabled'
    }
  ];

  for (const bannerData of bannersData) {
    await prisma.banner.create({
      data: {
        ...bannerData,
        createdAt: dayjs().subtract(Math.floor(Math.random() * 5), 'day').toDate()
      }
    });
  }

  // 6. 创建2个文本区块
  console.log('📝 创建2个文本区块...');
  const textBlocksData = [
    {
      key: 'hero',
      title_zh: '欢迎使用AI视频搜索系统',
      title_en: 'Welcome to AI Video Search System',
      sub_zh: '通过先进的人工智能技术，为您提供精准的视频内容检索服务',
      sub_en: 'Providing precise video content retrieval services through advanced AI technology',
      bullets_zh: JSON.stringify([
        '多模态智能识别',
        '毫秒级搜索响应',
        '海量视频库支持',
        '多语言界面'
      ]),
      bullets_en: JSON.stringify([
        'Multimodal intelligent recognition',
        'Millisecond search response',
        'Massive video library support',
        'Multi-language interface'
      ]),
      visible: true,
      sort: 1
    },
    {
      key: 'features',
      title_zh: '核心功能特色',
      title_en: 'Core Features',
      sub_zh: '我们的AI视频搜索系统具备以下核心优势',
      sub_en: 'Our AI video search system has the following core advantages',
      bullets_zh: JSON.stringify([
        '智能场景识别和内容理解',
        '支持图片、视频、文本多种输入方式',
        '实时搜索结果排序优化',
        '用户隐私数据严格保护',
        '24/7全天候技术支持'
      ]),
      bullets_en: JSON.stringify([
        'Intelligent scene recognition and content understanding',
        'Support for image, video, and text input methods',
        'Real-time search result sorting optimization',
        'Strict protection of user privacy data',
        '24/7 technical support'
      ]),
      visible: true,
      sort: 2
    }
  ];

  for (const textBlockData of textBlocksData) {
    await prisma.textBlock.create({ data: textBlockData });
  }

  console.log('✅ 种子数据生成完成！');
  console.log(`
📊 数据统计:
- 套餐: ${plans.length}个 (高级/超级/终极/至尊)
- 用户: ${users.length}个 (包含3个同网关用户)
- 订单: 20个 (覆盖所有状态)
- 评价: 6个 (demo/beta/real各2条)
- 轮播图: 3个
- 文本区块: 2个

🔍 特殊场景:
- IP Hash相同的用户: ${users.slice(0, 3).map(u => u.account).join(', ')}
- 已验证购买评价: 4条
- 各种订单状态完整覆盖
- 多语言内容支持
  `);

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error('❌ 种子数据生成失败:', e);
    process.exit(1);
  });
