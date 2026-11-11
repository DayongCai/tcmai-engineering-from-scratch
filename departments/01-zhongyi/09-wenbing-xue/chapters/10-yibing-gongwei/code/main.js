'use strict';
/**
 * 第 10 章 · 《溫疫論》：戾气 / 膜原 / 九传 的可复算索引
 *
 *   node code/main.js
 *
 * 数据：standards/wenbing/底本.json → books[id='wenyilun']（外源·笈成留档，sha256 见 standards/wenbing/README.md）
 * 对照：books[id='tiaobian']（《溫病條辨》），只用于 compare() 的两列并置。
 *
 * 口径（改任何一条都要同步改 docs/zh.md）：
 *   1. 溫疫論 **无条号**，只有「卷—篇—段」。段号 `article.no` 是本库按源页分段编的，
 *      不与任何刊本对应；引用一律写「外源·笈成·溫疫論 上卷·原病·第N段」。
 *   2. 九传不是背九个词：原文在两处各列一遍（原病·第1段 / 統論疫有九傳治法·第1段），
 *      下卷那处列了 **10 项** 却自称「凡此九傳」，只有把「表勝於里 / 里勝於表」并成
 *      「表裡偏勝」（原病的写法）才收敛到 9。代码复算这个收敛，不硬编码结论。
 *   3. 词频统计的是「**出现该词的段数**」，不是出现次数。一段里连说三次「膜原」只算一次。
 *      用它比较各篇的论述重心可以，拿它当论证权重不行。
 *   4. 底本 counts.formulas = 0：源把方名、药味、煎法拆成独立段，未做方剂解析。
 *      达原饮由 dayuanYin() 按「方名段 → 下一段是药味行」重新拼出来，只拼这一首。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BOOKS = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/wenbing/底本.json'), 'utf8'));
const BOOK = BOOKS.books.find((b) => b.id === 'wenyilun');
const TIAOBIAN = BOOKS.books.find((b) => b.id === 'tiaobian');

/** 全部段 + 出处，段序即源页序 */
const SEGS = BOOK.sections.flatMap((s) =>
  s.articles.map((a) => ({ juan: s.juan, pian: s.pian, no: a.no, hant: a.zhHant, hans: a.zhHans })),
);

/** 「外源·笈成·溫疫論 上卷·原病·第1段」；自敘无篇名时省略篇 */
function refOf(seg) {
  const where = seg.pian ? `${seg.juan}·${seg.pian}` : seg.juan;
  return `外源·笈成·溫疫論 ${where}·第${seg.no}段`;
}

const has = (t, kw) => t.includes(kw);
const segsWith = (kw) => SEGS.filter((s) => has(s.hant, kw));

// ─────────── 语料规模 ───────────

/** 卷/篇/段 三个实数，以及「哪些篇在讲理论、哪些在讲治法」的段数分布 */
function corpus() {
  const juan = {};
  for (const s of BOOK.sections) {
    juan[s.juan] = juan[s.juan] || { pian: 0, segs: 0 };
    juan[s.juan].pian += 1;
    juan[s.juan].segs += s.articles.length;
  }
  const pian = BOOK.sections
    .filter((s) => s.pian)
    .map((s) => ({ juan: s.juan, pian: s.pian, segs: s.articles.length }))
    .sort((a, b) => b.segs - a.segs);
  return {
    juan,
    sections: BOOK.sections.length,
    pianTotal: BOOK.sections.filter((s) => s.pian).length,
    segs: SEGS.length,
    charsHant: BOOK.counts.charsHant,
    formulas: BOOK.counts.formulas,
    top: pian.slice(0, 8),
  };
}

// ─────────── 戾气：三个词不是同义词 ───────────

/**
 * 「戾氣」「癘氣」「雜氣」「異氣」在全书里各出现在哪些段。
 *
 * 三者层次不同，混用会把作者的论证抹平：
 *   雜氣 = 类别（「氣之不一」，气有无限种，疫只是其中一种）
 *   癘氣 = 程度（「疫氣者亦雜氣中之一，但有甚於他氣，故為病頗重，因名之癘氣」）
 *   戾氣 = 性质（厚朴所破之「戾氣所結」；正名篇又作「時行戾氣」）
 * 所以「戾气说」是后人的概括，不是原书的一个术语定义。
 */
function liqi() {
  const TERMS = ['戾氣', '癘氣', '雜氣', '異氣'];
  const hits = TERMS.flatMap((kw) =>
    segsWith(kw).map((s) => ({ term: kw, ref: refOf(s), juan: s.juan, pian: s.pian })),
  );
  const byTerm = {};
  for (const t of TERMS) byTerm[t] = hits.filter((h) => h.term === t).length;
  // 同一段可命中多个词，去重后才是「涉及气论的总段数」
  const refs = [...new Set(hits.map((h) => h.ref))];
  return { byTerm, hits, distinctSegs: refs.length, refs };
}

// ─────────── 九传：两处枚举，一个收敛 ───────────

/**
 * 九传的规范表。key 是归并后的类型名；ref 指向下卷给出该传治法的段。
 * 顺序沿用原病·第1段的叙述序（先表后里、先里后表在前）。
 */
const JIU_CHUAN = [
  { key: '先表後里', label: '先表而後里', treat: '達原飲 → 白虎湯 → 達原飲加大黃；在上瓜蒂散，在下承氣湯', ref: '下卷·統論疫有九傳治法·第9段' },
  { key: '先里後表', label: '先里而後表', treat: '先下其里，裡證除後復熱脈浮者白虎湯；無汗加人參覆臥', ref: '下卷·統論疫有九傳治法·第10段' },
  { key: '但表不里', label: '但表而不里', treat: '斑、汗自解為順；汗不透白虎湯，斑不透舉斑湯，兩者並見白虎合舉斑湯', ref: '下卷·統論疫有九傳治法·第2段' },
  { key: '但里不表', label: '但里而不表', treat: '在上瓜蒂散吐之，在中下承氣輩導之；上中下皆病者不可吐', ref: '下卷·統論疫有九傳治法·第4段' },
  { key: '表裡偏勝', label: '表裡偏勝（表勝於里 / 里勝於表）', treat: '治其多者，少者兼之', ref: '下卷·統論疫有九傳治法·第8段' },
  { key: '表裡分傳', label: '表裡分傳', treat: '不可強汗，先以承氣通里，裡通則表自達；熱不退者三消飲', ref: '下卷·統論疫有九傳治法·第6段' },
  { key: '表而再表', label: '表而再表', treat: '膜原尚有隱伏之邪，仍前法治之；三表者希有', ref: '下卷·統論疫有九傳治法·第3段' },
  { key: '里而再里', label: '里而再里', treat: '在上仍吐，在下仍下；三里者希有', ref: '下卷·統論疫有九傳治法·第5段' },
  { key: '表裡分傳再分傳', label: '表裡分傳而又分傳', treat: '三消飲，復下復汗如前', ref: '下卷·統論疫有九傳治法·第7段' },
];

/** 原文表面形式 → 规范 key。下卷把「表勝於里 / 里勝於表」拆成两句，原病写作「表裡偏勝」 */
const NORMALIZE = {
  但表而不里: '但表不里',
  但里而不表: '但里不表',
  表而再表: '表而再表',
  里而再里: '里而再里',
  表裡分傳: '表裡分傳',
  表裡分傳而再分傳: '表裡分傳再分傳',
  表裡分傳而又分傳: '表裡分傳再分傳',
  表裡偏勝: '表裡偏勝',
  表勝於里: '表裡偏勝',
  里勝於表: '表裡偏勝',
  先表而後里: '先表後里',
  先里而後表: '先里後表',
};

const CN_NUM = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
const cnToNum = (s) => (s ? CN_NUM[s] : null);

/** 取「有X者」枚举；只在声明句「凡此N傳」之前找，后面的复述与旁证不算 */
function enumerate(text, stopAt) {
  const body = stopAt ? text.slice(0, text.indexOf(stopAt)) : text;
  const out = [];
  const re = /有([^，。；：]{2,12}?)者/g;
  let m;
  while ((m = re.exec(body))) {
    if (NORMALIZE[m[1]]) out.push({ surface: m[1], key: NORMALIZE[m[1]] });
  }
  return out;
}

const segAt = (juan, pian, no) => SEGS.find((s) => s.juan === juan && s.pian === pian && s.no === no);

/**
 * 九传抽取：两处枚举 + 两处自称 + 收敛结果。
 * 「病人各得其一，非謂一病而有九傳」——九传是**个体分流**的九种去向，不是九步病程。
 */
function jiuChuan() {
  const yb = segAt('上卷', '原病', 1);
  const ty = segAt('下卷', '統論疫有九傳治法', 1);
  const zx = segAt('自敘', null, 1);

  const lists = [
    { ref: refOf(yb), items: enumerate(yb.hant, '此言其大略'), stopAt: '此言其大略' },
    { ref: refOf(ty), items: enumerate(ty.hant, '凡此九傳'), stopAt: '凡此九傳' },
  ].map((l) => ({ ...l, distinct: new Set(l.items.map((i) => i.key)).size }));

  const declarations = [
    { ref: refOf(zx), quoted: '其傳有九，此治疫緊要關節', claimed: cnToNum('九') },
    { ref: refOf(ty), quoted: '凡此九傳', claimed: cnToNum('九') },
  ];

  const collapsed = lists[1].items.filter((i) => i.surface === '表勝於里' || i.surface === '里勝於表').map((i) => i.surface);

  return {
    types: JIU_CHUAN,
    lists,
    declarations,
    collapsed,
    /** 下卷「列 10 项、称九传」的差额：两项并为一条后才是 9 */
    surplus: lists[1].items.length - lists[1].distinct,
  };
}

// ─────────── 膜原：出现该词的段 ───────────

/**
 * 「膜原」24 段、跨 18 篇。它是**位置**，不是脏腑：
 * 原病说「舍於伏脊之內，去表不遠，附近於胃…即《針經》所謂橫連膜原是也」，
 * 故「在經為表，在胃為裡，邪在膜原者正當經胃交關之所，故為半表半裡」。
 * 治法上它是「邪之巢穴」——达原饮三味「直達其巢穴，使邪氣潰敗，速離膜原」。
 */
function membrane() {
  const segs = segsWith('膜原');
  const byJuan = {};
  for (const s of segs) byJuan[s.juan] = (byJuan[s.juan] || 0) + 1;
  const byPian = {};
  for (const s of segs) {
    const k = s.pian || s.juan;
    byPian[k] = (byPian[k] || 0) + 1;
  }
  const rank = Object.entries(byPian).sort((a, b) => b[1] - a[1]);
  return {
    total: segs.length,
    share: Number((segs.length / SEGS.length).toFixed(3)),
    byJuan,
    byPian: rank,
    refs: segs.map(refOf),
  };
}

/**
 * 达原饮：方名段 → 药味段 → 煎法段。底本未解析方剂，这里只重建这一首。
 * 药味行的形态是「藥名（劑量）」以单空格分隔（与金匮的 ⟨…⟩ 夹注、條辨的全角括号都不同源）。
 */
function dayuanYin() {
  const segs = BOOK.sections.find((s) => s.juan === '上卷' && s.pian === '溫疫初起').articles;
  const i = segs.findIndex((a) => a.zhHant.trim() === '達原飲');
  if (i < 0) return null;
  const nameSeg = segs[i];
  const herbSeg = segs[i + 1];
  const decoctionSeg = segs[i + 2];
  const herbs = [];
  const re = /([^\s（）]+)（([^）]*)）/g;
  let m;
  while ((m = re.exec(herbSeg.zhHant))) herbs.push({ herb: m[1], dose: m[2] });
  // 「三味協力，直達其巢穴」= 前三味拔邪；后四味「不過調和之劑」
  const PRIMARY = ['檳榔', '厚朴', '草果仁'];
  return {
    name: nameSeg.zhHant.trim(),
    ref: `外源·笈成·溫疫論 上卷·溫疫初起·第${nameSeg.no}段`,
    herbs,
    primary: herbs.filter((h) => PRIMARY.includes(h.herb)).map((h) => h.herb),
    ancillary: herbs.filter((h) => !PRIMARY.includes(h.herb)).map((h) => h.herb),
    decoction: decoctionSeg.zhHant.trim(),
    noteRef: `外源·笈成·溫疫論 上卷·溫疫初起·第${segs[i + 3].no}段`,
  };
}

// ─────────── 与《溫病條辨》的分工 ───────────

/**
 * 两列并置：可复算的（段数/条数/词频）标 basis:'count'，
 * 只能定性的（框架、入口方）标 basis:'text' —— 不许把后者写成数字。
 */
function compare() {
  const tbSegs = TIAOBIAN.sections.flatMap((s) => s.articles.map((a) => a.zhHant));
  const weYi = segsWith('疫').length;
  const tbYi = tbSegs.filter((t) => t.includes('疫')).length;
  const tbMo = tbSegs.filter((t) => t.includes('膜原')).length;
  const tbLi = tbSegs.filter((t) => t.includes('戾')).length;
  return [
    { dim: '条/段总数', we: SEGS.length, tb: tbSegs.length, basis: 'count' },
    { dim: '「疫」字所在段/条', we: weYi, tb: tbYi, basis: 'count' },
    { dim: '「膜原」所在段/条', we: segsWith('膜原').length, tb: tbMo, basis: 'count' },
    { dim: '「戾」字所在段/条', we: segsWith('戾').length, tb: tbLi, basis: 'count' },
    { dim: '疫的位置', we: '一种独立的病类，另立「九传」分流', tb: '九种温病之一（風温·温熱·温疫·温毒·冬温并列），按三焦定位', basis: 'text' },
    { dim: '入口治法', we: '疏利膜原（达原饮），继以汗、吐、下随传而治', tb: '随焦位选方（银翘散 / 白虎 / 承气 / 复脉）', basis: 'text' },
  ];
}

// ─────────── 输出 ───────────

function report() {
  const c = corpus();
  const l = liqi();
  const j = jiuChuan();
  const m = membrane();
  const d = dayuanYin();
  const rows = compare();

  console.log('');
  console.log('  教学边界：本输出为《溫疫論》文本结构统计，外源·笈成留档可复算，不构成诊疗依据。');
  console.log('');
  console.log('═══ 溫疫論 · 语料 ═══');
  console.log(`  节 ${c.sections}（篇 ${c.pianTotal} + 自敘 1）· 段 ${c.segs} · 繁字 ${c.charsHant} · 方（底本解析）${c.formulas}`);
  for (const [k, v] of Object.entries(c.juan)) console.log(`  ${k} | 篇 ${v.pian} | 段 ${v.segs}`);
  console.log(`  段数最多：${c.top.map((p) => `${p.pian} ${p.segs}`).join(' · ')}`);

  console.log('\n═══ 戾气：三个词各自的段 ═══');
  for (const [k, v] of Object.entries(l.byTerm)) console.log(`  ${k} | ${v} 段`);
  console.log(`  去重后涉及气论 ${l.distinctSegs} 段`);
  for (const h of l.hits) console.log(`   · ${h.term} — ${h.ref}`);

  console.log('\n═══ 九传 ═══');
  for (const s of j.lists) console.log(`  ${s.ref} → 列 ${s.items.length} 项，归并后 ${s.distinct} 类`);
  console.log(`  并项：${j.collapsed.join(' + ')} → 表裡偏勝（差额 ${j.surplus}）`);
  for (const t of j.types) console.log(`  ${t.key} | ${t.treat} | ${t.ref}`);

  console.log('\n═══ 膜原 ═══');
  console.log(`  ${m.total} 段 / ${c.segs} 段 = ${(m.share * 100).toFixed(1)}% · 跨 ${m.byPian.length} 篇`);
  for (const [k, v] of m.byPian.slice(0, 6)) console.log(`  ${k} | ${v}`);
  if (d) {
    console.log(`\n  ${d.name}：${d.herbs.map((h) => `${h.herb}(${h.dose})`).join(' ')}`);
    console.log(`  拔邪三味：${d.primary.join('·')}；调和四味：${d.ancillary.join('·')}`);
    console.log(`  煎法：${d.decoction}`);
  }

  console.log('\n═══ 溫疫論 × 溫病條辨 ═══');
  for (const r of rows) console.log(`  ${r.dim} | ${r.we} | ${r.tb} | ${r.basis}`);

  console.log('\n═══ 能建模 / 不能建模 ═══');
  console.log('  能：段—篇索引与词频（本文件全部输出）· 九传的类型枚举与并项规则 · 达原饮药味与加减规则');
  console.log('  不能：把「戾气」等同于细菌/病毒（原书无病原体概念、无分离培养）· 由九传给个体病程排序');
  console.log('        由「眾人均等」推出传染数 R0 · 据本章处方');
  console.log('');
}

if (require.main === module) report();

module.exports = { BOOK, TIAOBIAN, SEGS, refOf, corpus, liqi, jiuChuan, membrane, dayuanYin, compare, JIU_CHUAN, NORMALIZE };
