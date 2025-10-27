const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAdmin } = require('../utils/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Apply admin authentication to all routes
router.use(requireAdmin);

// ========== BANNERS MANAGEMENT ==========

/**
 * @swagger
 * /api/admin/banners:
 *   get:
 *     summary: Get banners list
 *     tags: [Admin - Home]
 *     security:
 *       - AdminToken: []
 *     responses:
 *       200:
 *         description: Banners retrieved successfully
 */
router.get('/banners', async (req, res) => {
  try {
    const banners = await prisma.banner.findMany({
      orderBy: [
        { weight: 'desc' },
        { sort: 'asc' },
        { createdAt: 'desc' }
      ]
    });
    res.json(banners);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/banners:
 *   post:
 *     summary: Create new banner
 *     tags: [Admin - Home]
 *     security:
 *       - AdminToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               imageUrl:
 *                 type: string
 *               altText:
 *                 type: string
 *               title_zh:
 *                 type: string
 *               title_en:
 *                 type: string
 *               desc_zh:
 *                 type: string
 *               desc_en:
 *                 type: string
 *               ctaText_zh:
 *                 type: string
 *               ctaText_en:
 *                 type: string
 *               ctaLink:
 *                 type: string
 *               language:
 *                 type: string
 *               region:
 *                 type: string
 *               weight:
 *                 type: integer
 *               sort:
 *                 type: integer
 *               status:
 *                 type: string
 *               startAt:
 *                 type: string
 *               endAt:
 *                 type: string
 *     responses:
 *       201:
 *         description: Banner created successfully
 */
router.post('/banners', async (req, res) => {
  try {
    const data = { ...req.body };
    
    // Convert date strings if provided
    if (data.startAt) data.startAt = new Date(data.startAt);
    if (data.endAt) data.endAt = new Date(data.endAt);

    const banner = await prisma.banner.create({
      data
    });
    
    res.status(201).json(banner);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/banners/{id}:
 *   patch:
 *     summary: Update banner
 *     tags: [Admin - Home]
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
 *         description: Banner updated successfully
 */
router.patch('/banners/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    
    // Convert date strings if provided
    if (data.startAt) data.startAt = new Date(data.startAt);
    if (data.endAt) data.endAt = new Date(data.endAt);

    const banner = await prisma.banner.update({
      where: { id: parseInt(req.params.id) },
      data
    });
    
    res.json(banner);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/banners/{id}:
 *   delete:
 *     summary: Delete banner
 *     tags: [Admin - Home]
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
 *         description: Banner deleted successfully
 */
router.delete('/banners/:id', async (req, res) => {
  try {
    await prisma.banner.delete({
      where: { id: parseInt(req.params.id) }
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== TEXT BLOCKS MANAGEMENT ==========

/**
 * @swagger
 * /api/admin/text-blocks:
 *   get:
 *     summary: Get text blocks list
 *     tags: [Admin - Home]
 *     security:
 *       - AdminToken: []
 *     responses:
 *       200:
 *         description: Text blocks retrieved successfully
 */
router.get('/text-blocks', async (req, res) => {
  try {
    const textBlocks = await prisma.textBlock.findMany({
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
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/text-blocks:
 *   post:
 *     summary: Create new text block
 *     tags: [Admin - Home]
 *     security:
 *       - AdminToken: []
 *     responses:
 *       201:
 *         description: Text block created successfully
 */
router.post('/text-blocks', async (req, res) => {
  try {
    const data = { ...req.body };
    
    // Stringify arrays if provided
    if (data.bullets_zh && Array.isArray(data.bullets_zh)) {
      data.bullets_zh = JSON.stringify(data.bullets_zh);
    }
    if (data.bullets_en && Array.isArray(data.bullets_en)) {
      data.bullets_en = JSON.stringify(data.bullets_en);
    }

    const textBlock = await prisma.textBlock.create({
      data
    });
    
    res.status(201).json(textBlock);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/text-blocks/{id}:
 *   patch:
 *     summary: Update text block
 *     tags: [Admin - Home]
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
 *         description: Text block updated successfully
 */
router.patch('/text-blocks/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    
    // Stringify arrays if provided
    if (data.bullets_zh && Array.isArray(data.bullets_zh)) {
      data.bullets_zh = JSON.stringify(data.bullets_zh);
    }
    if (data.bullets_en && Array.isArray(data.bullets_en)) {
      data.bullets_en = JSON.stringify(data.bullets_en);
    }

    const textBlock = await prisma.textBlock.update({
      where: { id: parseInt(req.params.id) },
      data
    });
    
    res.json(textBlock);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;