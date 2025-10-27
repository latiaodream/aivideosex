const fetch = global.fetch || require('node-fetch');

const TRON_USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const BSC_USDT_CONTRACT = '0x55d398326f99059fF775485246999027B3197955';

async function getSetting(prisma, key) {
  try {
    const row = await prisma.setting.findUnique({ where: { key } });
    if (row && row.value) return row.value;
  } catch (e) {}
  return process.env[key] || '';
}

async function getAddressPool(prisma, chain) {
  const key = chain === 'TRC20' ? 'PAY_TRON_ADDRESSES' : (chain === 'BSC' || chain === 'BEP20' ? 'PAY_BSC_ADDRESSES' : null);
  if (!key) return [];
  const v = await getSetting(prisma, key);
  return v.split(',').map(s => s.trim()).filter(Boolean);
}

const { notifyPayment } = require('../utils/notify');

// 密钥轮换索引（全局变量）
let tronApiKeyIndex = 0;

async function processTronAddress(prisma, addr) {
  try {
    // 优先使用 TRONGRID_API_KEY（已验证有效）
    const key1 = await getSetting(prisma, 'TRONGRID_API_KEY');
    const key2 = await getSetting(prisma, 'TRON_PRO_API_KEY');

    // 只使用非空的密钥
    const apiKeys = [key1, key2].filter(k => k && k.length > 0);

    if (apiKeys.length === 0) {
      console.error('[tron-watcher] No API keys configured');
      return;
    }

    // 轮换使用密钥
    const apiKey = apiKeys[tronApiKeyIndex % apiKeys.length];
    const keyIndex = tronApiKeyIndex % apiKeys.length;
    tronApiKeyIndex++;

    const url = `https://api.trongrid.io/v1/accounts/${addr}/transactions/trc20?limit=50&contract_address=${TRON_USDT_CONTRACT}`;

    const headers = {
      'TRON-PRO-API-KEY': apiKey
    };

    const res = await fetch(url, { headers });
    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      console.error(`[tron-watcher] TronGrid API error: ${res.status} for ${addr} (key ${keyIndex + 1}/${apiKeys.length}) - ${errorText.substring(0, 100)}`);
      return;
    }

    const data = await res.json();
    const list = data?.data || [];

    for (const tx of list) {
      // TronGrid 返回格式：value 是原始值（需要除以 10^6）
      const value = tx.value || 0;
      const decimals = 6; // USDT TRC20 使用 6 位小数
      const amount = Number(value) / Math.pow(10, decimals);
      if (!Number.isFinite(amount)) continue;
      const amt2 = Number(amount.toFixed(2));

      const order = await prisma.order.findFirst({
        where: {
          toAddress: addr,
          chain: 'TRC20',
          status: { in: ['pending', 'seen'] },
          amountDue: amt2
        }
      });
      if (!order) continue;

      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'credited',
          confirmations: 1,
          txHash: tx.transaction_id || null,
          fromAddress: tx.from || null,
          amountPaid: amt2,
          paidAt: new Date()
        }
      });

      const plan = await prisma.plan.findUnique({ where: { id: order.planId } });
      if (plan) {
        await prisma.user.update({
          where: { id: order.userId },
          data: {
            creditBalance: { increment: plan.creditGrant },
            totalSpentUSDT: { increment: amt2 }
          }
        });
      }

      console.log(`[tron-watcher] Order ${order.orderNo} credited: ${amt2} USDT`);
      try { await notifyPayment(prisma, order.id) } catch (e) {}
    }
  } catch (e) {
    console.error('[tron-watcher] Error:', e.message);
  }
}

async function processBscAddress(prisma, addr, apiKey) {
  try {
    const url = `https://api.bscscan.com/api?module=account&action=tokentx&contractaddress=${BSC_USDT_CONTRACT}&address=${addr}&sort=desc&apikey=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    const list = data?.result || [];
    for (const tx of list) {
      const dec = Number(tx.tokenDecimal || 18);
      const amount = Number(tx.value) / Math.pow(10, dec);
      if (!Number.isFinite(amount)) continue;
      const amt2 = Number(amount.toFixed(2));
      const order = await prisma.order.findFirst({ where: { toAddress: addr, chain: 'BSC', status: { in: ['pending', 'seen'] }, amountDue: amt2 } });
      if (!order) continue;
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'credited',
          confirmations: 1,
          txHash: tx.hash,
          fromAddress: tx.from,
          amountPaid: amt2,
          paidAt: new Date()
        }
      });
      const plan = await prisma.plan.findUnique({ where: { id: order.planId } });
      if (plan) {
        await prisma.user.update({ where: { id: order.userId }, data: { creditBalance: { increment: plan.creditGrant }, totalSpentUSDT: { increment: amt2 } } });
      }
      try { await notifyPayment(prisma, order.id) } catch (e) {}
    }
  } catch (e) {}
}

async function runWithConcurrency(items, worker, limit = 5) {
  const queue = [...items];
  const running = new Set();
  const results = [];
  async function runNext() {
    if (queue.length === 0) return;
    const item = queue.shift();
    const p = worker(item).catch(() => {}).finally(() => running.delete(p));
    running.add(p);
    if (running.size >= limit) await Promise.race(running);
    await runNext();
  }
  const starters = Math.min(limit, queue.length);
  for (let i = 0; i < starters; i++) results.push(runNext());
  await Promise.allSettled(results);
}

async function pollTron(prisma) {
  const addresses = await getAddressPool(prisma, 'TRC20');
  if (addresses.length === 0) return;
  await runWithConcurrency(addresses, (addr) => processTronAddress(prisma, addr), 5);
}

async function pollBsc(prisma) {
  const addresses = await getAddressPool(prisma, 'BSC');
  if (addresses.length === 0) return;
  const apiKey = await getSetting(prisma, 'BSCSCAN_API_KEY');
  await runWithConcurrency(addresses, (addr) => processBscAddress(prisma, addr, apiKey), 5);
}

function startPaymentWatchers(prisma) {
  const defaultMs = 10000; // 默认 10 秒（平衡速度和 API 限流）
  const envMs = Number(process.env.PAY_POLL_INTERVAL_MS || 0) || defaultMs;
  const intervalMs = Math.max(5000, envMs); // 最低 5 秒（避免过度请求）
  console.log(`[payment-watcher] Starting with interval: ${intervalMs}ms (${intervalMs/1000}s)`);
  setInterval(() => { pollTron(prisma); }, intervalMs);
  setInterval(() => { pollBsc(prisma); }, intervalMs);
}

async function fastCheckOrder(prisma, order) {
  if (!order) return;
  if (order.chain === 'TRC20') {
    await processTronAddress(prisma, order.toAddress);
  } else if (order.chain === 'BSC' || order.chain === 'BEP20') {
    const apiKey = await getSetting(prisma, 'BSCSCAN_API_KEY');
    await processBscAddress(prisma, order.toAddress, apiKey);
  }
}

module.exports = { startPaymentWatchers, fastCheckOrder };
