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

async function processTronAddress(prisma, addr) {
  try {
    const url = `https://apilist.tronscanapi.com/api/token_trc20/transfers?toAddress=${addr}&contractAddress=${TRON_USDT_CONTRACT}&limit=20&start=0`;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    const list = data?.token_transfers || data?.data || [];
    for (const tx of list) {
      let amount = 0;
      if (tx.amount_str) amount = parseFloat(tx.amount_str);
      else if (tx.quant && (tx.tokenDecimal || tx.decimals)) {
        const dec = Number(tx.tokenDecimal || tx.decimals);
        amount = Number(tx.quant) / Math.pow(10, dec);
      } else if (tx.amount) amount = parseFloat(tx.amount);
      if (!Number.isFinite(amount)) continue;
      const amt2 = Number(amount.toFixed(2));

      const order = await prisma.order.findFirst({ where: { toAddress: addr, chain: 'TRC20', status: { in: ['pending', 'seen'] }, amountDue: amt2 } });
      if (!order) continue;

      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'credited',
          confirmations: 1,
          txHash: tx.transaction_id || tx.hash || tx.txID || null,
          fromAddress: tx.fromAddress || tx.from || null,
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
  const defaultMs = 5000; // faster default 5s
  const envMs = Number(process.env.PAY_POLL_INTERVAL_MS || 0) || defaultMs;
  const intervalMs = Math.max(2000, envMs); // don't go below 2s
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
