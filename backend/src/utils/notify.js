const crypto = require('crypto')
const fetch = global.fetch || require('node-fetch')

async function getSetting(prisma, key) {
  try {
    const row = await prisma.setting.findUnique({ where: { key } })
    if (row && row.value) return row.value
  } catch (e) {}
  return process.env[key] || ''
}

function signPayload(secret, payload) {
  if (!secret) return null
  const h = crypto.createHmac('sha256', secret)
  h.update(JSON.stringify(payload))
  return h.digest('hex')
}

async function notifyPayment(prisma, orderId) {
  const url = await getSetting(prisma, 'PAYMENT_NOTIFY_URL')
  if (!url) return false
  const secret = await getSetting(prisma, 'PAYMENT_NOTIFY_SECRET')

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { plan: true, user: true } })
  if (!order) return false
  const payload = {
    event: 'payment.confirmed',
    orderNo: order.orderNo,
    status: order.status,
    chain: order.chain,
    token: 'USDT',
    amountDue: order.amountDue,
    amountPaid: order.amountPaid,
    toAddress: order.toAddress,
    fromAddress: order.fromAddress,
    txHash: order.txHash,
    userId: order.userId,
    planId: order.planId,
    credited: order.plan?.creditGrant || 0,
    paidAt: order.paidAt,
    createdAt: order.createdAt,
    timestamp: Date.now()
  }
  const headers = { 'Content-Type': 'application/json' }
  const sig = signPayload(secret, payload)
  if (sig) headers['X-Signature'] = sig
  try {
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) })
    return res.ok
  } catch (e) {
    console.error('notifyPayment error:', e.message)
    return false
  }
}

module.exports = { notifyPayment, getSetting }

