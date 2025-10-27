const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAdmin } = require('../utils/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(requireAdmin);

// GET settings with env fallback
router.get('/settings', async (req, res) => {
  try {
    const keys = [
      'PAY_TRON_ADDRESSES',
      'PAY_BSC_ADDRESSES',
      'TRONSCAN_API_KEY',
      'BSCSCAN_API_KEY',
      'PAYMENT_NOTIFY_URL',
      'PAYMENT_NOTIFY_SECRET'
    ];
    const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
    const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
    for (const k of keys) {
      if (!map[k] && process.env[k]) map[k] = process.env[k];
    }
    res.json(map);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH settings
router.patch('/settings', async (req, res) => {
  try {
    const payload = req.body || {};
    const entries = Object.entries(payload).filter(([k, v]) => typeof v === 'string');
    for (const [key, value] of entries) {
      await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
