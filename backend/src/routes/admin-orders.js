const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAdmin } = require('../utils/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Apply admin authentication to all routes
router.use(requireAdmin);

// ========== ORDERS MANAGEMENT ==========

/**
 * @swagger
 * /api/admin/orders:
 *   get:
 *     summary: Get orders list with filters
 *     tags: [Admin - Orders]
 *     security:
 *       - AdminToken: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: chain
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *       - in: query
 *         name: min
 *         schema:
 *           type: number
 *       - in: query
 *         name: max
 *         schema:
 *           type: number
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
 *         description: Orders retrieved successfully
 */
router.get('/orders', async (req, res) => {
  try {
    const {
      status = '',
      chain = '',
      from = '',
      to = '',
      min = '',
      max = '',
      page = 1,
      pageSize = 20
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    // Build where conditions
    const where = {};
    
    if (status) where.status = status;
    if (chain) where.chain = chain;
    
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    
    if (min || max) {
      where.amountDue = {};
      if (min) where.amountDue.gte = parseFloat(min);
      if (max) where.amountDue.lte = parseFloat(max);
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: { id: true, account: true }
          },
          plan: {
            select: { id: true, name_zh: true, name_en: true, code: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.order.count({ where })
    ]);

    res.json({
      data: orders,
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
 * /api/admin/orders/{id}:
 *   get:
 *     summary: Get order details
 *     tags: [Admin - Orders]
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
 *         description: Order details retrieved successfully
 *       404:
 *         description: Order not found
 */
router.get('/orders/:id', async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        user: true,
        plan: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/orders/{id}/mark-paid:
 *   post:
 *     summary: Mark order as paid (manual processing)
 *     tags: [Admin - Orders]
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
 *               amountPaid:
 *                 type: number
 *               txHash:
 *                 type: string
 *               fromAddress:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order marked as paid successfully
 */
router.post('/orders/:id/mark-paid', async (req, res) => {
  try {
    const { amountPaid, txHash, fromAddress } = req.body;
    const orderId = parseInt(req.params.id);

    // Get order details first
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { plan: true, user: true }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status === 'credited') {
      return res.status(400).json({ error: 'Order already credited' });
    }

    // Update order status and payment info
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        amountPaid: parseFloat(amountPaid),
        txHash,
        fromAddress,
        paidAt: new Date(),
        status: 'credited',
        confirmations: 1
      }
    });

    // Credit user account
    await prisma.user.update({
      where: { id: order.userId },
      data: {
        creditBalance: {
          increment: order.plan.creditGrant
        },
        totalSpentUSDT: {
          increment: parseFloat(amountPaid)
        }
      }
    });

    res.json({
      success: true,
      order: updatedOrder,
      creditsGranted: order.plan.creditGrant
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/orders/{id}/expire:
 *   post:
 *     summary: Mark order as expired
 *     tags: [Admin - Orders]
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
 *         description: Order expired successfully
 */
router.post('/orders/:id/expire', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);

    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'expired',
        expiresAt: new Date()
      }
    });

    res.json({
      success: true,
      order
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;