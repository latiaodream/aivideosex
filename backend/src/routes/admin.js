const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAdmin, generateIpHash, generateAccount, getCountryCode } = require('../utils/auth');
const fetch = global.fetch || require('node-fetch');

const router = express.Router();
const prisma = new PrismaClient();

// Import sub-routers
const ordersRouter = require('./admin-orders');
const reviewsRouter = require('./admin-reviews');
const homeRouter = require('./admin-home');

// Apply admin authentication to all routes
router.use(requireAdmin);

// Sub-routes
router.use('', ordersRouter);
router.use('', reviewsRouter);
router.use('', homeRouter);

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         account:
 *           type: string
 *         ipHash:
 *           type: string
 *         countryCode:
 *           type: string
 *         registerDevice:
 *           type: string
 *         registeredAt:
 *           type: string
 *           format: date-time
 *         lastLoginAt:
 *           type: string
 *           format: date-time
 *         creditBalance:
 *           type: integer
 *         totalSpentUSDT:
 *           type: number
 *         status:
 *           type: string
 *     Plan:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         code:
 *           type: string
 *         name_zh:
 *           type: string
 *         name_en:
 *           type: string
 *         priceUSDT:
 *           type: number
 *         creditGrant:
 *           type: integer
 *         sort:
 *           type: integer
 *         isActive:
 *           type: boolean
 */

// ========== USERS MANAGEMENT ==========

/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     summary: Create new user with generated account
 *     tags: [Admin - Users]
 *     security:
 *       - AdminToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               registerIp:
 *                 type: string
 *               registerDevice:
 *                 type: string
 *               countryCode:
 *                 type: string
 *               status:
 *                 type: string
 *               creditBalance:
 *                 type: integer
 *               tags:
 *                 type: array
 *     responses:
 *       201:
 *         description: User created successfully
 */
router.post('/users', async (req, res) => {
  try {
    const {
      registerIp,
      registerDevice = 'Web',
      countryCode,
      status = 'active',
      creditBalance = 0,
      tags = []
    } = req.body || {};

    if (!registerIp || typeof registerIp !== 'string') {
      return res.status(400).json({ error: 'registerIp is required' });
    }

    const ipHash = generateIpHash(registerIp);
    const account = await generateAccount(ipHash, prisma);
    const country = countryCode || getCountryCode(registerIp);

    const user = await prisma.user.create({
      data: {
        account,
        ipHash,
        registerIp,
        lastLoginIp: registerIp,
        registerDevice,
        countryCode: country,
        registeredAt: new Date(),
        lastLoginAt: new Date(),
        status,
        creditBalance: Number(creditBalance) || 0,
        totalSpentUSDT: 0,
        tags: Array.isArray(tags) ? JSON.stringify(tags) : JSON.stringify([])
      }
    });

    res.status(201).json({
      ...user,
      tags: Array.isArray(tags) ? tags : []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/translate:
 *   post:
 *     summary: Translate text using external service
 *     tags: [Admin - Tools]
 *     security:
 *       - AdminToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 description: Source text to translate
 *               source:
 *                 type: string
 *                 default: zh
 *               target:
 *                 type: string
 *                 default: es
 *     responses:
 *       200:
 *         description: Translation response
 */
router.post('/translate', async (req, res) => {
  let text;
  let source;
  let target;
  try {
    ({ text, source = 'zh', target = 'es' } = req.body || {});

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required' });
    }

    const response = await fetch('https://libretranslate.de/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json'
      },
      body: JSON.stringify({
        q: text,
        source,
        target,
        format: 'text'
      })
    });

    if (!response.ok) {
      throw new Error(`LibreTranslate error: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Translation error:', error);
    try {
      const langMap = {
        zh: 'zh-CN',
        'zh-CN': 'zh-CN',
        en: 'en',
        'en-US': 'en',
        es: 'es',
        'es-ES': 'es'
      };
      const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(langMap[source] || source)}&tl=${encodeURIComponent(langMap[target] || target)}&dt=t&q=${encodeURIComponent(text)}`;
      const googleResp = await fetch(googleUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });
      if (!googleResp.ok) {
        const fallback = await googleResp.text().catch(() => '');
        throw new Error(`Fallback translation failed: ${fallback}`);
      }
      const result = await googleResp.json();
      const translatedText = Array.isArray(result) ? result[0].map(item => item[0]).join('') : '';
      return res.json({ translatedText });
    } catch (fallbackError) {
      console.error('Fallback translation error:', fallbackError);
      res.json({ translatedText: text, warning: fallbackError.message || 'Translation unavailable, returning original text' });
    }
  }
});

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get users list with filters
 *     tags: [Admin - Users]
 *     security:
 *       - AdminToken: []
 *     parameters:
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *       - in: query
 *         name: device
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: paid
 *         schema:
 *           type: integer
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 */
router.get('/users', async (req, res) => {
  try {
    const { 
      keyword = '', 
      country = '', 
      device = '', 
      status = '', 
      paid = '', 
      from = '', 
      to = '', 
      page = 1, 
      pageSize = 20 
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    // Build where conditions
    const where = {};
    
    if (keyword) {
      where.OR = [
        { account: { contains: keyword } },
        { id: isNaN(parseInt(keyword)) ? undefined : parseInt(keyword) }
      ].filter(Boolean);
    }
    
    if (country) where.countryCode = country;
    if (device) where.registerDevice = device;
    if (status) where.status = status;
    if (paid === '1') where.totalSpentUSDT = { gt: 0 };
    
    if (from || to) {
      where.registeredAt = {};
      if (from) where.registeredAt.gte = new Date(from);
      if (to) where.registeredAt.lte = new Date(to);
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { registeredAt: 'desc' },
        select: {
          id: true,
          account: true,
          countryCode: true,
          registerDevice: true,
          registeredAt: true,
          lastLoginAt: true,
          lastLoginIp: true,
          registerIp: true,
          creditBalance: true,
          totalSpentUSDT: true,
          status: true,
          tags: true
        }
      }),
      prisma.user.count({ where })
    ]);

    // Process user data
    const processedUsers = users.map(user => ({
      ...user,
      lastLoginIp: user.lastLoginIp ? user.lastLoginIp.replace(/\.\d+$/, '.***') : null,
      registerIp: user.registerIp ? user.registerIp.replace(/\.\d+$/, '.***') : null,
      tags: user.tags ? JSON.parse(user.tags) : []
    }));

    res.json({
      data: processedUsers,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(total / parseInt(pageSize))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: Get user details
 *     tags: [Admin - Users]
 *     security:
 *       - AdminToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *       404:
 *         description: User not found
 */
router.get('/users/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        Orders: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Process user data for privacy and security
    const processedUser = {
      ...user,
      lastLoginIp: user.lastLoginIp ? user.lastLoginIp.replace(/\.\d+$/, '.***') : null,
      tags: user.tags ? JSON.parse(user.tags) : [],
      // Remove sensitive fields from response
      account: undefined,
      ipHash: undefined,
      registerIp: undefined
    };

    res.json(processedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/users/{id}:
 *   patch:
 *     summary: Update user
 *     tags: [Admin - Users]
 *     security:
 *       - AdminToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *               tags:
 *                 type: array
 *               creditBalance:
 *                 type: integer
 *     responses:
 *       200:
 *         description: User updated successfully
 */
router.patch('/users/:id', async (req, res) => {
  try {
    const { status, tags, creditBalance } = req.body;
    const data = {};
    
    if (status !== undefined) data.status = status;
    if (tags !== undefined) data.tags = JSON.stringify(tags);
    if (creditBalance !== undefined) data.creditBalance = creditBalance;

    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/users/{id}/credit/adjust:
 *   post:
 *     summary: Adjust user credit balance
 *     tags: [Admin - Users]
 *     security:
 *       - AdminToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: integer
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Credit adjusted successfully
 */
router.post('/users/:id/credit/adjust', async (req, res) => {
  try {
    const { amount, reason } = req.body;
    const userId = parseInt(req.params.id);

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        creditBalance: {
          increment: amount
        }
      }
    });

    // Simple log (in production, use a proper audit table)
    console.log(`Credit adjustment: User ${userId}, Amount: ${amount}, Reason: ${reason}`);

    res.json({
      success: true,
      newBalance: user.creditBalance,
      adjustment: amount,
      reason
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== PLANS MANAGEMENT ==========

/**
 * @swagger
 * /api/admin/plans:
 *   get:
 *     summary: Get all plans
 *     tags: [Admin - Plans]
 *     security:
 *       - AdminToken: []
 *     responses:
 *       200:
 *         description: Plans retrieved successfully
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: [{ sort: 'asc' }, { id: 'asc' }]
    });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/plans:
 *   post:
 *     summary: Create new plan
 *     tags: [Admin - Plans]
 *     security:
 *       - AdminToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Plan'
 *           examples:
 *             basic:
 *               summary: Basic with afterPay
 *               value:
 *                 code: ADV
 *                 name_zh: 高级版
 *                 name_en: Advanced
 *                 priceUSDT: 10
 *                 creditGrant: 100
 *                 postpay_zh: 已完成基础匹配
 *                 upsell_zh: 试试【超级版】
 *                 afterPay_zh: |
 *                   {"title":"🎯 基础匹配完成","subtitle":"建议上传更清晰图片或升级【超级版】","bullets":["更高命中率","更多结果"],"nextUpsell":{"show":true}}
 *     responses:
 *       201:
 *         description: Plan created successfully
 */
router.post('/plans', async (req, res) => {
  try {
    const payload = { ...req.body };
    // Validate afterPay JSON fields if present; allow both object and string
    ['afterPay_zh', 'afterPay_en', 'afterPay_es'].forEach((k) => {
      if (payload[k] !== undefined && payload[k] !== null && payload[k] !== '') {
        if (typeof payload[k] === 'object') {
          try { payload[k] = JSON.stringify(payload[k]); } catch (e) { throw new Error(`${k} must be valid JSON`); }
        } else if (typeof payload[k] === 'string') {
          try { JSON.parse(payload[k]); } catch (e) { throw new Error(`${k} must be valid JSON string`); }
        }
      }
    });

    const plan = await prisma.plan.create({ data: payload });
    res.status(201).json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/plans/{id}:
 *   patch:
 *     summary: Update plan
 *     tags: [Admin - Plans]
 *     security:
 *       - AdminToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Plan updated successfully
 */
router.patch('/plans/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    ['afterPay_zh', 'afterPay_en', 'afterPay_es'].forEach((k) => {
      if (data[k] !== undefined && data[k] !== null && data[k] !== '') {
        if (typeof data[k] === 'object') {
          try { data[k] = JSON.stringify(data[k]); } catch (e) { throw new Error(`${k} must be valid JSON`); }
        } else if (typeof data[k] === 'string') {
          try { JSON.parse(data[k]); } catch (e) { throw new Error(`${k} must be valid JSON string`); }
        }
      }
    });

    const plan = await prisma.plan.update({
      where: { id: parseInt(req.params.id) },
      data
    });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/plans/sort:
 *   patch:
 *     summary: Batch update plan sorting
 *     tags: [Admin - Plans]
 *     security:
 *       - AdminToken: []
 *     responses:
 *       200:
 *         description: Plans sorted successfully
 */
router.patch('/plans/sort', async (req, res) => {
  try {
    const { plans } = req.body; // [{ id, sort }]
    
    const updates = plans.map(({ id, sort }) =>
      prisma.plan.update({
        where: { id },
        data: { sort }
      })
    );

    await Promise.all(updates);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 生成测试用户数据 (仅用于开发测试)
router.post('/generate-test-users', async (req, res) => {
  try {
    const crypto = require('crypto');

    // 模拟不同国家的IP地址
    const testIPs = [
      { ip: '203.208.60.1', country: 'CN', device: 'Android' },
      { ip: '8.8.8.8', country: 'US', device: 'iOS' },
      { ip: '1.1.1.1', country: 'US', device: 'Web' },
      { ip: '185.199.108.1', country: 'DE', device: 'Android' },
      { ip: '13.107.42.14', country: 'US', device: 'iOS' },
      { ip: '172.217.164.1', country: 'JP', device: 'Web' },
      { ip: '52.84.223.1', country: 'SG', device: 'Android' },
      { ip: '104.16.132.1', country: 'FR', device: 'iOS' },
      { ip: '151.101.193.1', country: 'UK', device: 'Web' },
      { ip: '23.235.32.1', country: 'KR', device: 'Android' }
    ];

    const users = [];

    for (let i = 0; i < testIPs.length; i++) {
      const testData = testIPs[i];
      const ipHash = crypto.createHash('sha256').update(testData.ip).digest('hex').substring(0, 8);
      const today = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      const account = `u_${ipHash}_${today}`;

      // 随机生成一些变化
      const registeredAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // 过去7天内
      const lastLoginAt = new Date(registeredAt.getTime() + Math.random() * 24 * 60 * 60 * 1000); // 注册后24小时内
      const creditBalance = Math.floor(Math.random() * 100);
      const totalSpent = (Math.random() * 50).toFixed(2);

      const user = await prisma.user.create({
        data: {
          account,
          ipHash,
          registerIp: testData.ip,
          lastLoginIp: testData.ip,
          countryCode: testData.country,
          registerDevice: testData.device,
          registeredAt,
          lastLoginAt,
          creditBalance,
          totalSpentUSDT: totalSpent,
          status: 'active',
          tags: JSON.stringify([])
        }
      });

      users.push(user);
    }

    res.json({
      success: true,
      message: `成功生成 ${users.length} 个测试用户`,
      users: users.map(u => ({
        id: u.id,
        account: u.account,
        registerIp: u.registerIp,
        countryCode: u.countryCode,
        registerDevice: u.registerDevice
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
