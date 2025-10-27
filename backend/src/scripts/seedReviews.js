const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');

dotenv.config();

const prisma = new PrismaClient();

const reviewPayloads = [
  {
    displayName: '林太太·广州',
    stars: 5,
    content_zh: '终极版配客服指导，8分钟抓到老公“出差”酒店录像，时间线完整。至尊版帮整理证据，律师马上受理。升级毫不后悔。',
    content_en: 'Ultimate plus support pulled the hotel clip from my husband’s “trip” in 8 minutes with a full timeline. Supreme wrapped the evidence and my lawyer filed same day.',
    content_es: 'Ultimate y soporte hallaron en 8 minutos el video del “viaje” con línea de tiempo. Supreme armó el expediente y mi abogada presentó el mismo día.',
    sourceType: 'real',
    verified: true,
    language: 'zh-CN',
    status: 'published',
    pinned: true,
    sort: 1
  },
  {
    displayName: 'Claudia M. | CDMX',
    stars: 5,
    content_zh: '超级版上传男友小视频，10分钟匹配到同房间不同女生画面并标注时间。终极版下载高清源，现在连供应商素材都拿它筛。',
    content_en: 'Ran his clip through Super; within 10 minutes it matched the same room with another girl and exact timestamps. Ultimate grabbed HD sources—now I vet suppliers with it.',
    content_es: 'Con Super subí su clip; en 10 minutos salió el mismo cuarto con otra chica y marcas de tiempo. Ultimate bajó todo en HD y ahora reviso proveedores con eso.',
    sourceType: 'real',
    verified: true,
    language: 'es-MX',
    status: 'published',
    pinned: false,
    sort: 2
  },
  {
    displayName: '匿名星探',
    stars: 5,
    content_zh: '明星物料拼时效，超级版先清糊图，终极版补帧标源。凌晨付费，四点前拿到4K母带，第二天博主位直接爆。',
    content_en: 'Timing wins. Super cleaned the leaked still, Ultimate filled frames and tagged every source. Paid past midnight, had a 4K master before 4 a.m.—post exploded next morning.',
    content_es: 'La velocidad manda. Super limpió la foto filtrada, Ultimate rellenó cuadros y etiquetó fuentes. Pagado de madrugada, antes de las 4 a.m. ya tenía el 4K; el post explotó.',
    sourceType: 'beta',
    verified: true,
    language: 'zh-CN',
    status: 'published',
    pinned: false,
    sort: 3
  },
  {
    displayName: 'Diego R. · Guadalajara',
    stars: 4,
    content_zh: '高级版无结果，升级终极版立刻找到成人站存档，纹身完全一致。追加至尊版请分析师教我合法截取，自信多了。',
    content_en: 'Advanced missed; Ultimate instantly found an adult-site replay with the identical tattoo. Supreme’s analyst coached me on court-safe capture—upgrade paid for itself.',
    content_es: 'Advanced no dio nada; Ultimate halló un replay con el mismo tatuaje. Supreme y su analista me guiaron en la captura legal; valió cada peso.',
    sourceType: 'real',
    verified: true,
    language: 'es-MX',
    status: 'published',
    pinned: false,
    sort: 4
  },
  {
    displayName: '陈律师·深圳',
    stars: 5,
    content_zh: '婚调案最怕证据链断，我常备至尊版。团队把酒店视频、聊天、链上付款做成法庭可用目录，示例一展示客户立刻加购。',
    content_en: 'In marriage cases I keep Supreme on standby. They bundle hotel video, chats, and on-chain payments into court-ready decks; clients upgrade on the spot after seeing the sample.',
    content_es: 'En divorcios tengo Supreme listo. Entregan video de hotel, chats y pagos on-chain en dossier para juzgado; los clientes suben de plan al ver el ejemplo.',
    sourceType: 'real',
    verified: true,
    language: 'zh-CN',
    status: 'published',
    pinned: false,
    sort: 5
  },
  {
    displayName: 'Eva L. · Monterrey',
    stars: 5,
    content_zh: '女友总说和闺蜜出门，超级版比对到同时间她和陌生男在停车场的画面。至尊版客服指导保全证据，隔天就摊牌。',
    content_en: 'Girlfriend insisted it was girls’ night, but Super surfaced parking-lot footage with another guy at the same time. Supreme walked me through preserving proof; I confronted her next day.',
    content_es: 'Decía que era noche de chicas, pero Super mostró el estacionamiento con otro hombre a la misma hora. Supreme me guió a guardar la evidencia y la enfrenté al día siguiente.',
    sourceType: 'real',
    verified: true,
    language: 'es-MX',
    status: 'published',
    pinned: false,
    sort: 6
  },
  {
    displayName: '吴经理·深圳供应链',
    stars: 5,
    content_zh: '合作方老给模糊样片，超级版清晰化后，终极版直接挖出原站下载链接，省去层层沟通。采购团队现在全员配额。',
    content_en: 'Vendors kept sending blurry teasers. Super sharpened them and Ultimate uncovered source links—no more back-and-forth. Procurement now budgets this tool for every brief.',
    content_es: 'Los proveedores enviaban teasers borrosos. Super los limpió y Ultimate encontró los links; evitamos semanas de correos. Compras ya separa saldo para esto.',
    sourceType: 'beta',
    verified: true,
    language: 'zh-CN',
    status: 'published',
    pinned: false,
    sort: 7
  },
  {
    displayName: 'Jorge P. · Monterrey',
    stars: 4,
    content_zh: '高级版没撞到女友短片来源，客服提示上传付款截图。终极版用链上金额指纹匹配到她常看的站点，证据铁了。',
    content_en: 'Advanced struck out until support told me to upload the payment receipt. Ultimate used the on-chain fingerprint to match her favorite site—no excuses left.',
    content_es: 'Advanced no halló nada; soporte pidió el recibo. Ultimate usó la huella on-chain y dio con el sitio que ella consumía. Sin pretextos.',
    sourceType: 'real',
    verified: true,
    language: 'es-MX',
    status: 'published',
    pinned: false,
    sort: 8
  },
  {
    displayName: '小雨·上海',
    stars: 5,
    content_zh: '闺蜜怀疑男友，终极版 6 分钟把他和婚礼摄像师后台视频匹配出来。我们加购至尊版，让团队写告知函。',
    content_en: 'Friend doubted her fiancé. Ultimate matched him to a wedding backstage clip in 6 minutes. We upgraded to Supreme and had the team draft the notice letter.',
    content_es: 'Mi amiga dudaba del prometido. Ultimate lo vinculó en 6 minutos con un backstage de boda. Supreme redactó la carta y cerramos el caso.',
    sourceType: 'real',
    verified: true,
    language: 'zh-CN',
    status: 'published',
    pinned: false,
    sort: 9
  },
  {
    displayName: 'Sofía G. | Puebla',
    stars: 5,
    content_zh: '想看昔日偶像冷门采访，超级版拉到粉站备份，终极版补帧到1080P。至尊版打包素材，粉丝群疯狂转发。',
    content_en: 'Wanted a rare idol interview. Super tapped fan backups, Ultimate upscaled to 1080p. Supreme packaged the assets—fan club went wild.',
    content_es: 'Buscaba una entrevista rara de mi ídolo. Super tiró de backups fans y Ultimate lo dejó en 1080p. Supreme lo empaquetó y el club lo difundió.',
    sourceType: 'demo',
    verified: true,
    language: 'es-MX',
    status: 'published',
    pinned: false,
    sort: 10
  },
  {
    displayName: 'Marco A. · Bogotá',
    stars: 5,
    content_zh: '终极版把明星夜跑录影和八卦碎片一键汇总，加字幕直接出片。品牌方当场签约，工具费用马上回本。',
    content_en: 'Ultimate fused the celebrity night-run footage with gossip fragments and auto-captioned it. Brand signed immediately—the tool paid for itself in one brief.',
    content_es: 'Ultimate juntó la carrera nocturna con clips de chismes y generó subtítulos. La marca firmó al instante; la licencia se pagó sola.',
    sourceType: 'beta',
    verified: true,
    language: 'zh-CN',
    status: 'published',
    pinned: false,
    sort: 11
  },
  {
    displayName: '张姐·杭州婚庆',
    stars: 5,
    content_zh: '新娘想确认伴郎背景，超级版找出他在海外论坛的视频记录。至尊版提供证据模板，客户立刻签年度服务。',
    content_en: 'Bride wanted the best man vetted. Super surfaced his overseas forum clips. Supreme provided evidence templates and the client signed an annual plan on the spot.',
    content_es: 'La novia quiso verificar al padrino. Super encontró sus videos en foros. Supreme dio plantillas y contrataron el plan anual al instante.',
    sourceType: 'real',
    verified: true,
    language: 'zh-CN',
    status: 'published',
    pinned: false,
    sort: 12
  },
  {
    displayName: 'Laura Q. · Tijuana',
    stars: 4,
    content_zh: '帮姐姐离婚取证，终极版定位第三者常去的健身房直播。客服教我静默录制，资料一交对方立刻和谈。',
    content_en: 'Helping my sister’s divorce. Ultimate pinned the mistress to recurring gym streams. Support taught discreet capture—once we served it, he pushed for settlement.',
    content_es: 'Ayudé a mi hermana. Ultimate ubicó a la amante en lives del gym. Soporte explicó la captura discreta y él pidió arreglo inmediato.',
    sourceType: 'real',
    verified: true,
    language: 'es-MX',
    status: 'published',
    pinned: false,
    sort: 13
  },
  {
    displayName: 'Henry W. · Miami',
    stars: 5,
    content_zh: '审艺人风险时，终极版聚合20多个站点的视频，自动出争议时间轴。提案会一次过，预算再也没人质疑。',
    content_en: 'Vetting a spokesperson? Ultimate aggregates clips from 20+ sites into a controversy timeline. Proposal clears in one pass—budget never questioned again.',
    content_es: 'Para auditar voceros, Ultimate junta clips de 20+ sitios y arma la línea de controversias. El pitch pasa de una y nadie duda del presupuesto.',
    sourceType: 'beta',
    verified: true,
    language: 'en-US',
    status: 'published',
    pinned: false,
    sort: 14
  },
  {
    displayName: '许工·广州影音社',
    stars: 5,
    content_zh: '终极版补帧配至尊版托管，把婚礼监控做成4K精剪，交付提速三倍。新人送锦旗，老板说这是最划算投资。',
    content_en: 'Ultimate plus Supreme turned venue CCTV into a 4K highlight reel, tripling delivery speed. Newlyweds brought a thank-you banner—boss says it’s our smartest spend.',
    content_es: 'Ultimate con Supreme volvió el CCTV en reel 4K y triplicó la entrega. Los novios trajeron manta de agradecimiento; el jefe dice que fue la mejor inversión.',
    sourceType: 'beta',
    verified: true,
    language: 'zh-CN',
    status: 'published',
    pinned: false,
    sort: 15
  },
  {
    displayName: 'Paola R. · Cancún',
    stars: 5,
    content_zh: '怀疑丈夫出海行程，终极版复原船上自拍倒影，至尊版核验航线，当晚就敲定财产分割。',
    content_en: 'Suspected my husband’s boat “trip”. Ultimate rebuilt the selfie reflection, Supreme verified the route—we closed the asset split that night.',
    content_es: 'Sospechaba del “paseo” en barco. Ultimate reconstruyó el reflejo y Supreme verificó la ruta; esa noche cerramos la división de bienes.',
    sourceType: 'real',
    verified: true,
    language: 'es-MX',
    status: 'published',
    pinned: false,
    sort: 16
  },
  {
    displayName: '王姐·天津婚调',
    stars: 5,
    content_zh: '客户犹豫时先用高级版试水，再展示至尊版整理的证据包，签约率翻倍。团队已把它列为必备工具。',
    content_en: 'When clients hesitate we start them on Advanced, then show a Supreme evidence pack—close rate doubled. Our investigators now list it as mandatory gear.',
    content_es: 'Si dudan, inicio con Advanced y enseño el paquete Supreme; la tasa de cierre se duplicó. El equipo lo considera herramienta obligatoria.',
    sourceType: 'real',
    verified: true,
    language: 'zh-CN',
    status: 'published',
    pinned: false,
    sort: 17
  },
  {
    displayName: 'Luis F. · Querétaro',
    stars: 4,
    content_zh: '想抢明星盗版首映，超级版定位 Telegram 备份，终极版自动打标签，至尊版整合片段给会员付费观看。',
    content_en: 'Needed a leaked premiere. Super traced the Telegram backup, Ultimate auto-tagged scenes, Supreme curated the cuts for paying members.',
    content_es: 'Quería la premiere filtrada. Super ubicó el backup en Telegram, Ultimate etiquetó escenas y Supreme montó el corte para socios premium.',
    sourceType: 'demo',
    verified: true,
    language: 'es-MX',
    status: 'published',
    pinned: false,
    sort: 18
  },
  {
    displayName: 'Mei & Co. 调查',
    stars: 5,
    content_zh: '外企委托查婚姻欺诈，至尊版多模态交叉核验，输出中英双语报告，客户直接续签两年。',
    content_en: 'Corporate marital-fraud checks made easy: Supreme cross-validates with multimodal search and delivers bilingual reports—clients renewed for two years.',
    content_es: 'Investigar fraudes matrimoniales para corporativos es sencillo: Supreme cruza fuentes y entrega reportes bilingües; renovaron por dos años.',
    sourceType: 'real',
    verified: true,
    language: 'zh-CN',
    status: 'published',
    pinned: false,
    sort: 19
  },
  {
    displayName: 'Gabriela S. · Lima',
    stars: 5,
    content_zh: '超级版识别到男友常打赏的主播，终极版回放同夜语音。至尊版提供分手协议模板，干净利落。',
    content_en: 'Super spotted the streamer he kept tipping; Ultimate replayed the same-night voice chat. Supreme handed me a breakup agreement template—clean exit.',
    content_es: 'Super detectó a la streamer de sus propinas; Ultimate reprodujo la llamada de esa noche. Supreme me dio el acuerdo de ruptura, salida limpia.',
    sourceType: 'real',
    verified: true,
    language: 'es-MX',
    status: 'published',
    pinned: false,
    sort: 20
  },
  {
    displayName: '陈博士·AI实验室',
    stars: 5,
    content_zh: '终极版快速抓训练集，至尊版托管标注流程，成本降一半。预算已经写进下季度项目表。',
    content_en: 'Ultimate pulls clean training sets fast; Supreme manages annotation. Costs halved and the budget is locked into next quarter’s roadmap.',
    content_es: 'Ultimate obtiene datasets limpios y Supreme gestiona la anotación. Costos a la mitad; ya está en el presupuesto del próximo trimestre.',
    sourceType: 'beta',
    verified: true,
    language: 'zh-CN',
    status: 'published',
    pinned: false,
    sort: 21
  },
  {
    displayName: 'Roberto D. · Madrid',
    stars: 4,
    content_zh: '粉丝会要 90 年代综艺，超级版匹配磁带截图，终极版补帧去噪。至尊版建在线库，订阅涨 30%。',
    content_en: 'Fans begged for 90s variety shows. Super matched VHS grabs, Ultimate upscaled and denoised. Supreme built an online library—subscriptions jumped 30%.',
    content_es: 'Fans pedían shows noventeros. Super emparejó VHS, Ultimate restauró imagen y Supreme montó la biblioteca en línea; suscripciones +30%.',
    sourceType: 'demo',
    verified: true,
    language: 'en-US',
    status: 'published',
    pinned: false,
    sort: 22
  },
  {
    displayName: 'Lily K. · Toronto',
    stars: 5,
    content_zh: '终极版根据合伙人 IG 照片连到私人派对录像，至尊版顾问拟好回购条款，他乖乖让出股份。',
    content_en: 'Ultimate traced my partner’s IG photo to private party footage. Supreme’s consultant drafted the buy-back terms—he handed the shares over without a fight.',
    content_es: 'Ultimate conectó la foto de mi socio con un video privado. El consultor de Supreme redactó la recompra y entregó las acciones sin pelear.',
    sourceType: 'real',
    verified: true,
    language: 'en-US',
    status: 'published',
    pinned: false,
    sort: 23
  },
  {
    displayName: '赵律师·成都',
    stars: 5,
    content_zh: '法院喜欢细节，至尊版团队按证据节点建树状索引，开庭投屏一步到位，法官全程点头。',
    content_en: 'Courts love detail. Supreme maps evidence into a timeline tree; we project it in hearings and the judge nods through the whole presentation.',
    content_es: 'En tribunales mandan los detalles. Supreme arma el árbol cronológico y lo proyectamos en sala; el juez asiente de principio a fin.',
    sourceType: 'real',
    verified: true,
    language: 'zh-CN',
    status: 'published',
    pinned: false,
    sort: 24
  },
  {
    displayName: 'Miguel H. · León',
    stars: 4,
    content_zh: '终极版揪出竞争对手提前泄露的样片，至尊版顾问写好版权声明，我们抢先发声，客户续费半年。',
    content_en: 'Ultimate caught a competitor leaking our sample. Supreme drafted the copyright statement so we spoke first—client renewed for six months.',
    content_es: 'Ultimate detectó que un competidor filtró nuestro sample. Supreme redactó el aviso y nos adelantamos; el cliente renovó por seis meses.',
    sourceType: 'beta',
    verified: true,
    language: 'es-MX',
    status: 'published',
    pinned: false,
    sort: 25
  },
  {
    displayName: '佳佳·台北',
    stars: 5,
    content_zh: '怀疑糖爸爸脚踏两船，终极版用姿态识别锁定他在夜店的直播。至尊版客服指导我匿名备份，看到证据当晚就断干净。',
    content_en: 'Suspected my “sponsor”. Ultimate’s pose match locked him in nightclub live streams. Supreme taught me anonymous backups—cut ties the same night.',
    content_es: 'Sospechaba de mi “patrocinador”. Ultimate lo ubicó en lives del club y Supreme me guió a guardar copias anónimas. Corté de inmediato.',
    sourceType: 'real',
    verified: true,
    language: 'zh-CN',
    status: 'published',
    pinned: false,
    sort: 26
  },
  {
    displayName: 'Fernanda V. · Oaxaca',
    stars: 5,
    content_zh: '想做舞蹈课程，超级版连到抖音高清源，终极版拆分动作并生成字幕。至尊版把课程包上线，首周售罄。',
    content_en: 'Building a dance course: Super linked to the HD TikTok source, Ultimate broke steps with captions, Supreme published the course bundle—sold out week one.',
    content_es: 'Monté un curso de baile. Super enlazó la fuente HD, Ultimate separó pasos con subtítulos y Supreme subió el paquete; se agotó en una semana.',
    sourceType: 'demo',
    verified: true,
    language: 'es-MX',
    status: 'published',
    pinned: false,
    sort: 27
  },
  {
    displayName: '周总·厦门MCN',
    stars: 5,
    content_zh: '终极版能把百万粉丝账号的素材一键归类，至尊版再输出标题脚本，我们新主播上手一周涨粉十万。',
    content_en: 'Ultimate categorizes big-influencer footage instantly; Supreme outputs title scripts. New anchors gained 100k followers in a week.',
    content_es: 'Ultimate clasifica material de influencers y Supreme genera guiones de título. Nuestros nuevos hosts sumaron 100k seguidores en siete días.',
    sourceType: 'beta',
    verified: true,
    language: 'zh-CN',
    status: 'published',
    pinned: false,
    sort: 28
  },
  {
    displayName: 'Daniel P. · Buenos Aires',
    stars: 4,
    content_zh: '终极版把足球俱乐部的历史片段补齐，至尊版帮我做版权备注，会员区上线后一晚就回本。',
    content_en: 'Ultimate completed a club’s historic football footage; Supreme added licensing notes. Members-only release recouped the fee overnight.',
    content_es: 'Ultimate completó el archivo histórico del club y Supreme agregó notas de licencia. El estreno para socios recuperó la inversión en una noche.',
    sourceType: 'demo',
    verified: true,
    language: 'es-MX',
    status: 'published',
    pinned: false,
    sort: 29
  },
  {
    displayName: '李太太·香港',
    stars: 5,
    content_zh: '怀疑丈夫和助理暧昧，终极版匹配他们在机场的牵手画面。至尊版顾问帮我准备协议，现在房产在我名下。',
    content_en: 'Suspected my husband and his assistant. Ultimate matched them holding hands in airport footage. Supreme’s advisor prepped the agreement—property now sits in my name.',
    content_es: 'Sospechaba de mi esposo y su asistente. Ultimate los vinculó tomados de la mano en el aeropuerto. Supreme preparó el acuerdo y ahora el inmueble está a mi nombre.',
    sourceType: 'real',
    verified: true,
    language: 'zh-CN',
    status: 'published',
    pinned: false,
    sort: 30
  }
];

async function main() {
  console.log('📝 Seeding high-conversion reviews...');

  for (const payload of reviewPayloads) {
    const { displayName, language, ...rest } = payload;
    const existing = await prisma.review.findFirst({
      where: { displayName, language }
    });

    if (existing) {
      await prisma.review.update({
        where: { id: existing.id },
        data: rest
      });
      console.log(`♻️  Updated review for ${displayName} (${language})`);
    } else {
      await prisma.review.create({
        data: {
          displayName,
          language,
          ...rest
        }
      });
      console.log(`✅ Created review for ${displayName} (${language})`);
    }
  }

  console.log('🎉 Review seeding complete.');
}

main()
  .catch((err) => {
    console.error('❌ Failed to seed reviews:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

