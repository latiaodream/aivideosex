const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAdmin } = require('../utils/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Apply admin authentication to all routes
router.use(requireAdmin);

// ========== REVIEWS MANAGEMENT ==========

/**
 * @swagger
 * /api/admin/reviews:
 *   get:
 *     summary: Get reviews list with filters
 *     tags: [Admin - Reviews]
 *     security:
 *       - AdminToken: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: sourceType
 *         schema:
 *           type: string
 *       - in: query
 *         name: stars
 *         schema:
 *           type: integer
 *       - in: query
 *         name: language
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
 *         description: Reviews retrieved successfully
 */
router.get('/reviews', async (req, res) => {
  try {
    const {
      status = '',
      sourceType = '',
      stars = '',
      language = '',
      page = 1,
      pageSize = 20
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    // Build where conditions
    const where = {};
    
    if (status) where.status = status;
    if (sourceType) where.sourceType = sourceType;
    if (stars) where.stars = parseInt(stars);
    if (language) where.language = language;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take,
        orderBy: [
          { pinned: 'desc' },
          { sort: 'asc' },
          { createdAt: 'desc' }
        ]
      }),
      prisma.review.count({ where })
    ]);

    res.json({
      data: reviews,
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
 * /api/admin/reviews:
 *   post:
 *     summary: Create new review
 *     tags: [Admin - Reviews]
 *     security:
 *       - AdminToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *               avatarUrl:
 *                 type: string
 *               stars:
 *                 type: integer
 *               content_zh:
 *                 type: string
 *               content_en:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               sourceType:
 *                 type: string
 *               verified:
 *                 type: boolean
 *               orderId:
 *                 type: integer
 *               language:
 *                 type: string
 *               status:
 *                 type: string
 *               pinned:
 *                 type: boolean
 *               sort:
 *                 type: integer
 *               startAt:
 *                 type: string
 *               endAt:
 *                 type: string
 *     responses:
 *       201:
 *         description: Review created successfully
 */
router.post('/reviews', async (req, res) => {
  try {
    const data = { ...req.body };
    
    // Convert date strings if provided
    if (data.startAt) data.startAt = new Date(data.startAt);
    if (data.endAt) data.endAt = new Date(data.endAt);

    const review = await prisma.review.create({
      data
    });
    
    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/reviews/{id}:
 *   patch:
 *     summary: Update review
 *     tags: [Admin - Reviews]
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
 *         description: Review updated successfully
 */
router.patch('/reviews/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    
    // Convert date strings if provided
    if (data.startAt) data.startAt = new Date(data.startAt);
    if (data.endAt) data.endAt = new Date(data.endAt);

    const review = await prisma.review.update({
      where: { id: parseInt(req.params.id) },
      data
    });
    
    res.json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/reviews/{id}:
 *   delete:
 *     summary: Delete review
 *     tags: [Admin - Reviews]
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
 *         description: Review deleted successfully
 */
router.delete('/reviews/:id', async (req, res) => {
  try {
    await prisma.review.delete({
      where: { id: parseInt(req.params.id) }
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;