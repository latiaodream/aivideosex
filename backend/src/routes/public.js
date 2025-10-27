const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/public/plans:
 *   get:
 *     summary: Get active plans for frontend display
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: Active plans retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   code:
 *                     type: string
 *                   name_zh:
 *                     type: string
 *                   name_en:
 *                     type: string
 *                   priceUSDT:
 *                     type: number
 *                   creditGrant:
 *                     type: integer
 *                   postpay_zh:
 *                     type: string
 *                   postpay_en:
 *                     type: string
 *                   upsell_zh:
 *                     type: string
 *                   upsell_en:
 *                     type: string
 *                   sort:
 *                     type: integer
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: [
        { sort: 'asc' },
        { id: 'asc' }
      ]
    });

    res.json(plans);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch plans',
      message: error.message 
    });
  }
});

/**
 * @swagger
 * /api/public/banners:
 *   get:
 *     summary: Get active banners for homepage
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *         description: Language code (zh-CN, en-US)
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *         description: Region code (US, CN, etc.)
 *     responses:
 *       200:
 *         description: Active banners retrieved successfully
 */
router.get('/banners', async (req, res) => {
  try {
    const { language = 'zh-CN', region } = req.query;
    
    // Simplified query for now to debug the issue
    const banners = await prisma.banner.findMany({
      where: {
        status: 'enabled'
      },
      orderBy: [
        { weight: 'desc' },
        { sort: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    res.json(banners);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch banners',
      message: error.message 
    });
  }
});

/**
 * @swagger
 * /api/public/text-blocks:
 *   get:
 *     summary: Get visible text blocks for homepage
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: Visible text blocks retrieved successfully
 */
router.get('/text-blocks', async (req, res) => {
  try {
    const textBlocks = await prisma.textBlock.findMany({
      where: { visible: true },
      orderBy: [
        { sort: 'asc' },
        { id: 'asc' }
      ]
    });

    // Parse JSON strings for bullets
    const parsedBlocks = textBlocks.map(block => ({
      ...block,
      bullets_zh: block.bullets_zh ? JSON.parse(block.bullets_zh) : null,
      bullets_en: block.bullets_en ? JSON.parse(block.bullets_en) : null
    }));

    res.json(parsedBlocks);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch text blocks',
      message: error.message 
    });
  }
});

/**
 * @swagger
 * /api/public/reviews:
 *   get:
 *     summary: Get published reviews for display
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *         description: Language code
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Published reviews retrieved successfully
 */
router.get('/reviews', async (req, res) => {
  try {
    const { language = 'zh-CN', limit = 20 } = req.query;
    
    const where = {
      status: 'published'
    };
    
    if (language) {
      where.language = language;
    }
    
    // Add date filtering for scheduled reviews
    const now = new Date();
    where.OR = [
      { startAt: null },
      { startAt: { lte: now } }
    ];
    where.AND = [
      {
        OR: [
          { endAt: null },
          { endAt: { gte: now } }
        ]
      }
    ];

    const reviews = await prisma.review.findMany({
      where,
      take: parseInt(limit),
      orderBy: [
        { pinned: 'desc' },
        { sort: 'asc' },
        { createdAt: 'desc' }
      ],
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        stars: true,
        content_zh: true,
        content_en: true,
        imageUrl: true,
        sourceType: true,
        verified: true,
        language: true,
        createdAt: true
      }
    });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch reviews',
      message: error.message 
    });
  }
});

module.exports = router;