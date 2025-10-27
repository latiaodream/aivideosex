const { PrismaClient, Prisma } = require('@prisma/client');
const dotenv = require('dotenv');

dotenv.config();

const prisma = new PrismaClient();

// 幂等同步四档套餐，afterPay JSON 控制在 191 字符以内
const planPayloads = [
  {
    code: 'ADV',
    name_zh: '智能检索 · 高级版',
    name_en: 'Smart Search · Advanced',
    name_es: 'Búsqueda Inteligente · Avanzado',
    priceUSDT: new Prisma.Decimal('10'),
    creditGrant: 120,
    sort: 1,
    isActive: true,
    postpay_zh: '标准引擎已完成热门索引匹配，结果即将刷新。如需更多通道，可升级「超级版」。',
    postpay_en: 'Standard engine finished hot-index matching. Upgrade to Super for broader coverage.',
    postpay_es: 'El motor básico terminó. Los resultados se actualizan en segundos. Mejora a Super.',
    upsell_zh: '命中不够？升级「超级版」获得多源并行召回。',
    upsell_en: 'Need higher recall? Upgrade to Super for multi-source matching.',
    upsell_es: '¿Quieres más aciertos? Pasa al plan Super.',
    afterPay_zh: JSON.stringify({
      title: '🎯 匹配完成',
      text: '基础引擎已完成，结果将刷新。',
      cta: { text: '升级超级版', url: '/checkout?plan=SUP' }
    }),
    afterPay_en: JSON.stringify({
      title: '🎯 Match Ready',
      text: 'Baseline engine finished. Results refresh soon.',
      cta: { text: 'Upgrade to Super', url: '/checkout?plan=SUP' }
    }),
    afterPay_es: JSON.stringify({
      title: '🎯 Coincidencia lista',
      text: 'Resultados básicos listos. Se actualizan pronto.',
      cta: { text: 'Mejorar a Super', url: '/checkout?plan=SUP' }
    })
  },
  {
    code: 'SUP',
    name_zh: '多通道检索 · 超级版',
    name_en: 'Multi-Channel · Super',
    name_es: 'Búsqueda Multicanal · Super',
    priceUSDT: new Prisma.Decimal('20'),
    creditGrant: 320,
    sort: 2,
    isActive: true,
    postpay_zh: '多引擎召回与跨站向量索引已启动。如需深度语义推理，可升级「终极版」。',
    postpay_en: 'Multi-engine recall running. Upgrade to Ultimate for deeper reasoning.',
    postpay_es: 'Recuperación multicanal en marcha. Mejora a Ultimate para análisis profundo.',
    upsell_zh: '想要更强语义理解？升级「终极版」。',
    upsell_en: 'Need stronger semantics? Upgrade to Ultimate.',
    upsell_es: '¿Necesitas más semántica? Sube a Ultimate.',
    afterPay_zh: JSON.stringify({
      title: '⚡ 多通道完成',
      text: '并行召回已完成快速重排。',
      cta: { text: '升级终极版', url: '/checkout?plan=ULT' }
    }),
    afterPay_en: JSON.stringify({
      title: '⚡ Multi-Channel Done',
      text: 'Parallel recall finished swift rerank.',
      cta: { text: 'Upgrade to Ultimate', url: '/checkout?plan=ULT' }
    }),
    afterPay_es: JSON.stringify({
      title: '⚡ Multicanal listo',
      text: '8+ canales evaluados con reorden rápido.',
      cta: { text: 'Mejorar a Ultimate', url: '/checkout?plan=ULT' }
    })
  },
  {
    code: 'ULT',
    name_zh: '深度重排 · 终极版',
    name_en: 'Deep Rerank · Ultimate',
    name_es: 'Reordenamiento Profundo · Ultimate',
    priceUSDT: new Prisma.Decimal('35'),
    creditGrant: 520,
    sort: 3,
    isActive: true,
    postpay_zh: '高质量素材库与帧级特征已完成组合。如需人工协助可升级「至尊版」。',
    postpay_en: 'Premium sources + frame features combined. Upgrade to Supreme for concierge help.',
    postpay_es: 'Fuentes premium y rasgos por fotograma combinados. Mejora a Supreme para asistencia.',
    upsell_zh: '缺少关键镜头？升级「至尊版」获取人工跟进。',
    upsell_en: 'Still missing shots? Supreme adds concierge follow-up.',
    upsell_es: '¿Sigues sin coincidencia? Supreme añade soporte humano.',
    afterPay_zh: JSON.stringify({
      title: '💎 终极完成',
      text: '多模型打分已输出候选。',
      cta: { text: '预约至尊版', url: '/checkout?plan=SUPR' }
    }),
    afterPay_en: JSON.stringify({
      title: '💎 Ultimate Ready',
      text: 'Scoring finished. See top picks now.',
      cta: { text: 'Book Supreme', url: '/checkout?plan=SUPR' }
    }),
    afterPay_es: JSON.stringify({
      title: '💎 Ultimate listo',
      text: 'Modelos múltiples puntuaron las mejores coincidencias.',
      cta: { text: 'Solicitar Supreme', url: '/checkout?plan=SUPR' }
    })
  },
  {
    code: 'SUPR',
    name_zh: '专属管家 · 至尊版',
    name_en: 'Concierge · Supreme',
    name_es: 'Conserjería · Supreme',
    priceUSDT: new Prisma.Decimal('68'),
    creditGrant: 900,
    sort: 4,
    isActive: true,
    postpay_zh: '专属管家流程已开启，团队会在 5-15 分钟内反馈。',
    postpay_en: 'Concierge flow active. Expect follow-up within 5-15 minutes.',
    postpay_es: 'Flujo concierge activo. Respuesta en 5-15 minutos.',
    upsell_zh: '已在最高档服务，将持续跟进直至命中。',
    upsell_en: 'Top tier service engaged until confirmed.',
    upsell_es: 'Servicio premium activo hasta confirmar la coincidencia.',
    afterPay_zh: JSON.stringify({
      title: '👑 专属服务',
      text: '人工复核与私有索引回查中。'
    }),
    afterPay_en: JSON.stringify({
      title: '👑 Concierge Active',
      text: 'Manual review and private index checks in progress.'
    }),
    afterPay_es: JSON.stringify({
      title: '👑 Equipo concierge',
      text: 'Revisión manual y verificación privada en curso.'
    })
  }
];

async function main() {
  console.log('🌱 Upserting plans...');

  for (const payload of planPayloads) {
    await prisma.plan.upsert({
      where: { code: payload.code },
      update: payload,
      create: payload
    });
    console.log(`✔ Plan ${payload.code} synced`);
  }

  console.log('✅ Done.');
}

main()
  .catch((err) => {
    console.error('❌ Failed to seed plans:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
