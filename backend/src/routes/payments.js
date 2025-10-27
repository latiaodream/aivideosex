const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();
const { notifyPayment } = require('../utils/notify');

// Webhook/ingest endpoint for on-chain payment notifications from watchers
// Body: { chain, txHash, toAddress, fromAddress, amount }
router.post('/ingest', async (req, res) => {
  try {
    const { chain, txHash, toAddress, fromAddress, amount } = req.body;
    if (!chain || !toAddress || !amount || !txHash) {
      return res.status(400).json({ error: 'Missing fields', message: 'chain, txHash, toAddress and amount are required' });
    }

    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount)) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Find pending order by exact amount and address within active window
    const order = await prisma.order.findFirst({
      where: {
        toAddress: toAddress,
        chain: chain,
        status: 'pending',
        amountDue: parsedAmount
      },
      include: { plan: true, user: true }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found for given payment' });
    }

    // Mark as confirmed and credit
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'confirmed',
        amountPaid: parsedAmount,
        fromAddress: fromAddress || order.fromAddress,
        txHash: txHash,
        paidAt: new Date(),
      }
    });

    await prisma.user.update({
      where: { id: order.userId },
      data: {
        creditBalance: { increment: order.plan.creditGrant },
        totalSpentUSDT: { increment: parsedAmount }
      }
    });

    try { await notifyPayment(prisma, order.id) } catch (e) {}
    res.json({ success: true, matchedOrder: order.orderNo, credited: order.plan.creditGrant });
  } catch (e) {
    console.error('Payment ingest error:', e);
    res.status(500).json({ error: 'Ingest failed', message: e.message });
  }
});
// Force check endpoint: trigger immediate on-chain query for a given order
router.post('/force-check', async (req, res) => {
  try {
    const { orderNo } = req.body || {}
    if (!orderNo) return res.status(400).json({ error: 'Missing orderNo' })

    const order = await prisma.order.findUnique({ where: { orderNo } })
    if (!order) return res.status(404).json({ error: 'Order not found' })
    if (!['pending', 'seen'].includes(order.status)) {
      return res.json({ success: true, status: order.status })
    }

    const { fastCheckOrder } = require('../watchers/paymentsWatcher')
    await fastCheckOrder(prisma, order)

    // re-fetch status
    const updated = await prisma.order.findUnique({ where: { id: order.id } })
    return res.json({ success: true, status: updated.status })
  } catch (e) {
    console.error('Force check error:', e)
    res.status(500).json({ error: 'Force check failed', message: e.message })
  }
})


module.exports = router;
