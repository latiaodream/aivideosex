const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/public/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: integer
 *                 description: User ID
 *               planId:
 *                 type: integer
 *                 description: Plan ID
 *               chain:
 *                 type: string
 *                 enum: [TRC20, BSC, ERC20]
 *                 description: Blockchain network
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/', async (req, res) => {
  try {
    const { userId, planId, chain = 'TRC20' } = req.body;

    if (!userId || !planId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'userId and planId are required'
      });
    }

    // Validate user exists
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'Invalid user ID'
      });
    }

    // Validate plan exists and is active
    const plan = await prisma.plan.findUnique({
      where: { 
        id: parseInt(planId),
        isActive: true
      }
    });

    if (!plan) {
      return res.status(404).json({
        error: 'Plan not found',
        message: 'Invalid or inactive plan ID'
      });
    }

    // Generate order number
    const orderNo = generateOrderNumber();

    // Choose address and strict-unique fingerprint slot
    const baseAmount = parseFloat(plan.priceUSDT);
    const { address: paymentAddress, fingerprint, amountDue } = await chooseAddressAndFingerprint(chain, baseAmount, prisma);

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNo,
        userId: parseInt(userId),
        planId: parseInt(planId),
        chain,
        amountDue: amountDue,
        toAddress: paymentAddress,
        status: 'pending',
        amountFingerprint: fingerprint,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
      }
    });

    res.status(201).json({
      success: true,
      order: {
        id: order.id,
        orderNo: order.orderNo,
        planNames: {
          zh: plan.name_zh,
          en: plan.name_en,
          es: plan.name_es
        },
        planName: plan.name_zh,
        amountUSDT: order.amountDue,
        chain: order.chain,
        paymentAddress: order.toAddress,
        status: order.status,
        expiresAt: order.expiresAt,
        createdAt: order.createdAt
      }
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      error: 'Failed to create order',
      message: 'An error occurred while creating the order'
    });
  }
});

/**
 * @swagger
 * /api/public/orders/{orderNo}/status:
 *   get:
 *     summary: Get order status
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: orderNo
 *         required: true
 *         schema:
 *           type: string
 *         description: Order number
 *     responses:
 *       200:
 *         description: Order status retrieved successfully
 *       404:
 *         description: Order not found
 */
router.get('/:orderNo/status', async (req, res) => {
  try {
    const { orderNo } = req.params;

    const order = await prisma.order.findUnique({
      where: { orderNo },
      include: {
        plan: {
          select: {
            name_zh: true,
            name_en: true,
            name_es: true,
            postpay_zh: true,
            postpay_en: true,
            postpay_es: true,
            upsell_zh: true,
            upsell_en: true,
            upsell_es: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        error: 'Order not found',
        message: 'Invalid order number'
      });
    }

    // Check if order has expired
    const now = new Date();
    if (order.status === 'pending' && order.expiresAt && now > order.expiresAt) {
      // Update order status to expired
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'expired' }
      });
      order.status = 'expired';
    }

    res.json({
      success: true,
      order: {
        id: order.id,
        orderNo: order.orderNo,
        planNames: {
          zh: order.plan.name_zh,
          en: order.plan.name_en,
          es: order.plan.name_es
        },
        planName: order.plan.name_zh,
        amountUSDT: order.amountDue,
        chain: order.chain,
        paymentAddress: order.toAddress,
        status: order.status,
        expiresAt: order.expiresAt,
        createdAt: order.createdAt,
        plan: order.plan
      }
    });

  } catch (error) {
    console.error('Get order status error:', error);
    res.status(500).json({
      error: 'Failed to get order status',
      message: 'An error occurred while retrieving order status'
    });
  }
});

// Helper function to generate order number
function generateOrderNumber() {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `ORD${timestamp}${random}`;
}

// Helper function to get payment address based on chain
function getPaymentAddress(chain) {
  const env = process.env;
  let pool = [];
  if (chain === 'TRC20') {
    pool = (env.PAY_TRON_ADDRESSES || '').split(',').map(s => s.trim()).filter(Boolean);
  } else if (chain === 'BSC' || chain === 'BEP20') {
    pool = (env.PAY_BSC_ADDRESSES || '').split(',').map(s => s.trim()).filter(Boolean);
  }
  if (pool.length === 0) {
    // fallback to previous static if env not configured
    const fallback = {
      'TRC20': 'TRX7JwqbKGQQXrHqVeQqSKsua8d2VPiX9d',
      'BSC': '0x742d35Cc6634C0532925a3b8D4C9db96590b4165'
    };
    return fallback[chain] || fallback['TRC20'];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

module.exports = router;

// Strict address+fingerprint allocation across pool
async function chooseAddressAndFingerprint(chain, baseAmount, prisma) {
  let pools = await getAddressPoolFromSettings(chain, prisma);
  if (!pools || pools.length === 0) pools = getAddressPoolFromEnv(chain);
  if (pools.length === 0) pools = [getPaymentAddress(chain)];

  // Shuffle to avoid hotspot
  pools = pools.sort(() => Math.random() - 0.5);

  const now = new Date();
  for (const addr of pools) {
    const pendings = await prisma.order.findMany({
      where: {
        toAddress: addr,
        chain,
        status: 'pending',
        OR: [ { expiresAt: null }, { expiresAt: { gt: now } } ]
      },
      select: { amountDue: true }
    });
    const used = new Set(
      pendings.map(o => {
        const n = Number(o.amountDue);
        const fp = Math.round((n * 100) % 100);
        return fp === 0 ? 100 : fp;
      })
    );
    const free = [];
    for (let i = 1; i <= 99; i++) if (!used.has(i)) free.push(i);
    if (free.length === 0) continue;
    const fingerprint = free[Math.floor(Math.random() * free.length)];
    const amountDue = parseFloat((baseAmount + fingerprint / 100).toFixed(2));
    return { address: addr, fingerprint, amountDue };
  }
  // fallback if all addresses full
  const fallbackAddr = pools[0];
  const fingerprint = Math.floor(Math.random() * 99) + 1;
  const amountDue = parseFloat((baseAmount + fingerprint / 100).toFixed(2));
  return { address: fallbackAddr, fingerprint, amountDue };
}

function getAddressPoolFromEnv(chain) {
  const env = process.env;
  if (chain === 'TRC20') return (env.PAY_TRON_ADDRESSES || '').split(',').map(s => s.trim()).filter(Boolean);
  if (chain === 'BSC' || chain === 'BEP20') return (env.PAY_BSC_ADDRESSES || '').split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

async function getAddressPoolFromSettings(chain, prisma) {
  const key = chain === 'TRC20' ? 'PAY_TRON_ADDRESSES' : ((chain === 'BSC' || chain === 'BEP20') ? 'PAY_BSC_ADDRESSES' : null);
  if (!key) return [];
  try {
    const row = await prisma.setting.findUnique({ where: { key } });
    if (row && row.value) {
      return row.value.split(',').map(s => s.trim()).filter(Boolean);
    }
  } catch (e) {
    // ignore; will fallback to env
  }
  return [];
}
