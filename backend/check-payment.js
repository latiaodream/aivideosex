// 手动检查支付脚本
const fetch = require('node-fetch');

const TRON_USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const address = 'T9zjGjVs9PWfg1wpMVK1tXMxZhzGXHAsCR';
const expectedAmount = 10.15;

async function checkPayment() {
  console.log('检查地址:', address);
  console.log('期望金额:', expectedAmount, 'USDT');
  console.log('');

  try {
    const url = `https://apilist.tronscanapi.com/api/token_trc20/transfers?toAddress=${address}&contractAddress=${TRON_USDT_CONTRACT}&limit=50&start=0`;
    console.log('请求 TronScan API...');
    console.log('URL:', url);
    console.log('');

    const res = await fetch(url);
    
    if (!res.ok) {
      console.error('API 请求失败:', res.status, res.statusText);
      return;
    }

    const data = await res.json();
    const list = data?.token_transfers || data?.data || [];

    console.log(`找到 ${list.length} 笔交易记录`);
    console.log('');

    if (list.length === 0) {
      console.log('没有找到任何交易记录！');
      console.log('可能原因：');
      console.log('1. 交易还未上链确认');
      console.log('2. TronScan API 延迟');
      console.log('3. 支付到了错误的地址');
      return;
    }

    console.log('最近的交易记录：');
    console.log('='.repeat(80));

    for (let i = 0; i < Math.min(10, list.length); i++) {
      const tx = list[i];
      
      let amount = 0;
      if (tx.amount_str) {
        amount = parseFloat(tx.amount_str);
      } else if (tx.quant && (tx.tokenDecimal || tx.decimals)) {
        const dec = Number(tx.tokenDecimal || tx.decimals);
        amount = Number(tx.quant) / Math.pow(10, dec);
      } else if (tx.amount) {
        amount = parseFloat(tx.amount);
      }

      const amt2 = Number(amount.toFixed(2));
      const isMatch = amt2 === expectedAmount;

      console.log(`交易 #${i + 1}:`);
      console.log(`  金额: ${amt2} USDT ${isMatch ? '✅ 匹配!' : ''}`);
      console.log(`  原始金额: ${amount}`);
      console.log(`  发送方: ${tx.fromAddress || tx.from || 'N/A'}`);
      console.log(`  交易哈希: ${tx.transaction_id || tx.hash || tx.txID || 'N/A'}`);
      console.log(`  时间: ${tx.block_ts ? new Date(tx.block_ts).toISOString() : 'N/A'}`);
      console.log('');

      if (isMatch) {
        console.log('🎉 找到匹配的交易！');
        console.log('订单应该已经自动到账。如果没有，请检查：');
        console.log('1. 订单状态是否为 pending');
        console.log('2. 支付监听器是否正常运行');
        console.log('3. 数据库中的 amountDue 是否为', expectedAmount);
      }
    }

    console.log('='.repeat(80));

  } catch (error) {
    console.error('检查失败:', error.message);
    console.error(error);
  }
}

checkPayment();

