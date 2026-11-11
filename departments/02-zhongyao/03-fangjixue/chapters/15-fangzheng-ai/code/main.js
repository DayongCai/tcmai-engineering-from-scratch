'use strict';
/**
 * 方证对应与 AI：把「抓主症定主方」做成一次可复算的检索
 *
 *   node code/main.js
 *
 * 这一章不实现「智能组方」，只实现它最小的一步：给一组主症，从 114 首方里
 * 按字面命中把它排序，然后老老实实报召回。后面的加减、风险过滤、
 * 十八反检查都不在这里——那需要君臣佐使以外的禁忌字段，本章没有。
 *
 * 记号：
 *   · 候选方 = 主治字段与主症字面命中的方；命中 ≥2 项才入候选（单主症题放宽为 1）。
 *   · 得分 = Σ 命中项权重：命中在「必具症状区」（主治开头 40 字内）记 2 分，其余记 1 分。
 *     这条规则的依据是教材写法：必具症状写在主治开头，或然症写在后面——
 *     「主症定主方、或然症定加减」——教材·第24章·24.1.1（《方剂学·第24章·24.1》）。
 *   · 基准 14 例的主症与主方，全部取自教材第24章 24.1.1、24.1.2 的原句。
 *
 * 三处必须写在前面：
 *   1. 召回是字面召回。教材 24.1.1 说「大热、大汗、大渴」，白虎汤主治写「壮热面赤、
 *      汗出恶热、烦渴引饮」——同一个证，两处用字不同，字面检索直接归零。
 *   2. 主治字段已不是空的，但仍有缺口：114 首全有主治，其中 18 首只给证名、不列症状
 *      （六味地黄丸「肝肾阴虚证。」六字）。第6章泻下剂 6 首曾整章为空——上游抽取器原先
 *      只认「主治：X」，而该章写「主治有三。」「主治阳虚寒积证。」，不带冒号就整段抓不到；
 *      三种写法都认之后 6 首全部补回，长度上限从 127 字涨到 435 字，因为新补的段落把
 *      病机、治法也写了进去。检索的召回上限由字段完整度决定，不由排序算法决定。
 *   3. 本章只做检索基线，不构成诊断/用药依据。
 */

const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '../../../../../..');
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/fangji/formulas.json'), 'utf8'));
const FORMULAS = DATA.formulas;

/** 必具症状区：主治开头这么多字之内命中，记 2 分 */
const HEAD_ZONE = 40;
/** 候选门槛：命中主症项数不少于这个数（单主症题自动放宽为 1） */
const MIN_HITS = 2;

/** 15 个高频主症词：用来量「一个主症能圈出多少首方、跨多少章」 */
const SYMPTOM_WORDS = [
  '发热', '恶寒', '头痛', '呕吐', '下利', '腹痛', '口渴', '汗出',
  '咳嗽', '心烦', '心悸', '失眠', '痞满', '便秘', '喘',
];

/** 术语归一表：只收「教材两处用字不同、所指同一症」的对照，不猜、不扩 */
const SYNONYMS = {
  大热: '壮热',
  大汗: '汗出',
  大渴: '烦渴',
  胁痛: '两胁作痛',
};

/**
 * 基准 14 例。terms 是输入的主症要素，gold 是教材在 24.1.1 / 24.1.2 指定的主方。
 * group 只用于分层报召回：经方 8 例、时方 6 例。
 * 例 4（大热大汗大渴）与例 9、10、12、13 是已知会漏的例子，故意留着——
 * 漏在哪、为什么漏，比一个好看的召回率有用。
 */
const BENCH = [
  { id: 1, terms: ['往来寒热', '胸胁苦满'], gold: '小柴胡汤', group: '经方', loc: '24.1.1' },
  { id: 2, terms: ['恶寒发热', '无汗', '喘'], gold: '麻黄汤', group: '经方', loc: '24.1.1' },
  { id: 3, terms: ['头痛发热', '汗出', '恶风'], gold: '桂枝汤', group: '经方', loc: '24.1.1' },
  { id: 4, terms: ['大热', '大汗', '大渴'], gold: '白虎汤', group: '经方', loc: '24.1.1' },
  { id: 5, terms: ['潮热', '谵语', '腹满', '大便不通'], gold: '大承气汤', group: '经方', loc: '24.1.1' },
  { id: 6, terms: ['心下痞', '呕', '肠鸣', '下利'], gold: '半夏泻心汤', group: '经方', loc: '24.1.1' },
  { id: 7, terms: ['噫气不除', '心下痞'], gold: '旋覆代赭汤', group: '经方', loc: '24.1.1' },
  { id: 8, terms: ['腹痛', '喜按', '喜温'], gold: '小建中汤', group: '经方', loc: '24.1.1' },
  { id: 9, terms: ['头痛', '头重如裹', '胸闷呕恶'], gold: '半夏白术天麻汤', group: '时方', loc: '24.1.1' },
  { id: 10, terms: ['腰膝酸软', '头晕耳鸣'], gold: '六味地黄丸', group: '时方', loc: '24.1.2' },
  { id: 11, terms: ['胸痛', '头痛', '血瘀'], gold: '血府逐瘀汤', group: '时方', loc: '24.1.2' },
  { id: 12, terms: ['心悸', '失眠', '健忘'], gold: '归脾汤', group: '时方', loc: '24.1.2' },
  { id: 13, terms: ['胁痛', '月经不调'], gold: '逍遥散', group: '时方', loc: '24.1.2' },
  { id: 14, terms: ['夜热早凉', '热退无汗'], gold: '青蒿鳖甲汤', group: '时方', loc: '24.1.1' },
];

/** 折叠：去空白与常用标点，使「口苦，咽干」能命中「口苦咽干」 */
const fold = (s) => String(s || '')
  .replace(/\s/g, '')
  .replace(/[，,。．；;：:、（）()「」『』“”‘’"'']/g, '');

const nonWs = (s) => String(s || '').replace(/\s/g, '').length;

/** 码点序：并列时输出稳定、可复现，不依赖 locale */
const byName = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * 取一首方的「主治」文本。
 * @param {object} f 方
 * @param {'strict'|'fallback'} mode strict 只用主治字段；fallback 主治空时退回「功用与主治」整段
 * @returns {{text: string, raw: string, source: 'zhuzhi'|'parts'|'none'}}
 */
function zhuZhiOf(f, mode = 'strict') {
  const raw = (f.zhuzhi || '').trim();
  if (raw) return { text: fold(raw), raw, source: 'zhuzhi' };
  if (mode === 'fallback') {
    const parts = (f.parts && f.parts['功用与主治']) || '';
    if (parts) return { text: fold(parts), raw: parts, source: 'parts' };
  }
  return { text: '', raw: '', source: 'none' };
}

/** 主症归一：命中不到时再试同义词（只在 normalize=true 时启用） */
function termVariants(term, normalize) {
  const t = fold(term);
  const out = [t];
  if (normalize && SYNONYMS[term]) out.push(fold(SYNONYMS[term]));
  return out;
}

/**
 * 一首次候选方对一组主症的得分。
 * @returns {{hits: number, score: number, headHits: number, source: string}}
 */
function scoreFormula(f, terms, opts = {}) {
  const { mode = 'strict', normalize = false } = opts;
  const { text, source } = zhuZhiOf(f, mode);
  let hits = 0;
  let score = 0;
  let headHits = 0;
  if (text) {
    for (const term of terms) {
      let best = -1;
      for (const v of termVariants(term, normalize)) {
        const i = text.indexOf(v);
        if (i >= 0 && (best < 0 || i < best)) best = i;
      }
      if (best >= 0) {
        hits += 1;
        if (best <= HEAD_ZONE) {
          headHits += 1;
          score += 2;
        } else {
          score += 1;
        }
      }
    }
  }
  return { hits, score, headHits, source };
}

/**
 * 检索：按得分降序给出候选方。
 * @param {string[]} terms 主症要素
 * @param {{k?:number, mode?:string, normalize?:boolean, minHits?:number}} opts
 */
function retrieve(terms, opts = {}) {
  const { k = 5, minHits } = opts;
  const floor = minHits != null ? minHits : Math.min(MIN_HITS, terms.length);
  return FORMULAS
    .map((f) => ({ name: f.name, chapter: f.chapter, sec: f.sec, ...scoreFormula(f, terms, opts) }))
    .filter((x) => x.hits >= floor)
    .sort((a, b) => b.score - a.score || b.hits - a.hits || byName(a.name, b.name))
    .slice(0, k);
}

/**
 * 基准评估。rank 为 gold 在候选表中的位置（1 起）；null 表示未进候选。
 * @returns {{rows:Array, n:number, hit1:number, hit3:number, miss:number, zero:number,
 *            avgCand:number, recall1:number, recall3:number, byGroup:object, misses:Array}}
 */
function evaluate(bench = BENCH, opts = {}) {
  const rows = [];
  for (const b of bench) {
    const cand = retrieve(b.terms, { ...opts, k: FORMULAS.length });
    const idx = cand.findIndex((x) => x.name === b.gold);
    rows.push({
      id: b.id, terms: b.terms, gold: b.gold, group: b.group, loc: b.loc,
      cand: cand.length, rank: idx < 0 ? null : idx + 1,
      top: cand.slice(0, 3).map((x) => x.name),
      reason: idx < 0 ? (cand.length === 0 ? '零召回（字面与字段都不合）' : '漏检（候选非空但无 gold）') : '',
    });
  }
  const n = rows.length;
  const hit1 = rows.filter((r) => r.rank === 1).length;
  const hit3 = rows.filter((r) => r.rank != null && r.rank <= 3).length;
  const byGroup = {};
  for (const g of ['经方', '时方']) {
    const sub = rows.filter((r) => r.group === g);
    byGroup[g] = {
      n: sub.length,
      hit1: sub.filter((r) => r.rank === 1).length,
      hit3: sub.filter((r) => r.rank != null && r.rank <= 3).length,
    };
  }
  return {
    rows, n, hit1, hit3,
    miss: rows.filter((r) => r.rank == null).length,
    zero: rows.filter((r) => r.cand === 0).length,
    avgCand: rows.reduce((s, r) => s + r.cand, 0) / n,
    recall1: hit1 / n,
    recall3: hit3 / n,
    byGroup,
    misses: rows.filter((r) => r.rank == null),
  };
}

/** 单主症版：只取第一项主症，其余丢掉——用来看「一个主症够不够」 */
const singleTermBench = (bench = BENCH) => bench.map((b) => ({ ...b, terms: [b.terms[0]] }));

/**
 * 主症歧义度：一个主症词能圈出多少首方、跨多少章。
 * 圈出的方越多、跨章越广，这个主症越没有鉴别力。
 */
function ambiguity(words = SYMPTOM_WORDS) {
  return words.map((w) => {
    const hits = FORMULAS.filter((f) => zhuZhiOf(f, 'fallback').text.includes(fold(w)));
    const chapters = new Set(hits.map((f) => f.chapter));
    return { word: w, n: hits.length, chapters: chapters.size, coverage: hits.length / FORMULAS.length };
  });
}

/**
 * 主治字段审计：检索的召回上限由这里决定。
 * 空 = 主治字段为空；noZhengJian = 有字但正文里没有「症见」，即只给证名不列症状。
 */
function fieldAudit() {
  const empty = FORMULAS.filter((f) => !nonWs(f.zhuzhi));
  const withText = FORMULAS.filter((f) => nonWs(f.zhuzhi) > 0);
  const noZhengJian = withText.filter((f) => !(f.zhuzhi || '').includes('症见'));
  const lens = withText.map((f) => nonWs(f.zhuzhi)).sort((a, b) => a - b);
  const chapterCount = {};
  for (const f of empty) chapterCount[f.chapter] = (chapterCount[f.chapter] || 0) + 1;
  return {
    total: FORMULAS.length,
    empty: empty.length,
    emptyNames: empty.map((f) => f.name),
    emptyChapters: chapterCount,
    withZhengJian: withText.length - noZhengJian.length,
    noZhengJian: noZhengJian.length,
    noZhengJianNames: noZhengJian.map((f) => f.name),
    lenMin: lens[0],
    lenMedian: lens[Math.floor(lens.length / 2)],
    lenMax: lens[lens.length - 1],
  };
}

/** 组成药味集合完全相同的方组：若为 0，说明「按药味判方」在本数据上不会撞车 */
function compositionCollisions(list = FORMULAS) {
  const g = new Map();
  for (const f of list) {
    const key = [...new Set(f.composition.herbs.map((h) => h.name))].sort(byName).join('+');
    if (!g.has(key)) g.set(key, []);
    g.get(key).push(f.name);
  }
  const groups = [...g.values()].filter((v) => v.length > 1);
  return { groups, count: groups.length };
}

/** 知识底座的规模：114 方落在多少章、多少节 —— 这是「以法统方」那一层边的条数 */
function structureIndex(list = FORMULAS) {
  return {
    formulas: list.length,
    chapters: new Set(list.map((f) => f.chapter)).size,
    secs: new Set(list.map((f) => f.sec)).size,
    herbs: new Set(list.flatMap((f) => f.composition.herbs.map((h) => h.name))).size,
    slots: list.reduce((s, f) => s + f.composition.herbs.length, 0),
  };
}

/** 四种配置的对照：字段回退与术语归一各能救回多少召回 */
function configSweep() {
  const cfgs = [
    { key: 'strict·整串', opts: { mode: 'strict', normalize: false } },
    { key: 'strict·单主症', opts: { mode: 'strict', normalize: false, single: true } },
    { key: '回退·整串', opts: { mode: 'fallback', normalize: false } },
    { key: '回退·归一', opts: { mode: 'fallback', normalize: true } },
  ];
  return cfgs.map((c) => {
    const bench = c.opts.single ? singleTermBench() : BENCH;
    const r = evaluate(bench, { mode: c.opts.mode, normalize: c.opts.normalize });
    return { key: c.key, hit1: r.hit1, hit3: r.hit3, recall1: r.recall1, recall3: r.recall3, avgCand: r.avgCand };
  });
}

/** 规模自检：任一数不符即抛错，不让一个错的数被打印出去 */
function selfCheck() {
  const st = structureIndex();
  const fa = fieldAudit();
  const base = evaluate(BENCH, { mode: 'fallback', normalize: true });
  const single = evaluate(singleTermBench(), { mode: 'fallback', normalize: true });
  const checks = [
    { name: '方数 114', ok: FORMULAS.length === 114, got: FORMULAS.length },
    { name: '药位 836', ok: st.slots === 836, got: st.slots },
    { name: '药味 246', ok: st.herbs === 246, got: st.herbs },
    { name: '章 19 · 节 54', ok: st.chapters === 19 && st.secs === 54, got: `${st.chapters}/${st.secs}` },
    { name: '主治字段空 0 首（114/114 全有字）', ok: fa.empty === 0 && fa.withZhengJian + fa.noZhengJian === fa.total, got: fa.empty },
    { name: '第6章 6 首主治已补全（上游修复）', ok: FORMULAS.filter((f) => String(f.chapter) === '6').length === 6 && FORMULAS.filter((f) => String(f.chapter) === '6').every((f) => nonWs(f.zhuzhi) > 0), got: FORMULAS.filter((f) => String(f.chapter) === '6' && nonWs(f.zhuzhi) > 0).length + '/6' },
    { name: '含「症见」96 首 · 只给证名 18 首', ok: fa.withZhengJian === 96 && fa.noZhengJian === 18, got: `${fa.withZhengJian}/${fa.noZhengJian}` },
    { name: '基准 14 例（经方 8 / 时方 6）', ok: BENCH.length === 14 && BENCH.filter((b) => b.group === '经方').length === 8, got: BENCH.length },
    { name: '整串召回@1 = 8/14', ok: base.hit1 === 8, got: base.hit1 },
    { name: '整串召回@3 = 11/14', ok: base.hit3 === 11, got: base.hit3 },
    { name: '单主症召回@1 = 4/14', ok: single.hit1 === 4, got: single.hit1 },
    { name: '单主症召回@3 = 8/14', ok: single.hit3 === 8, got: single.hit3 },
  ];
  const bad = checks.filter((c) => !c.ok);
  if (bad.length) throw new Error('规模自检失败：' + bad.map((b) => `${b.name}（实得 ${b.got}）`).join('；'));
  return checks;
}

function main() {
  const st = structureIndex();
  const fa = fieldAudit();
  const amb = ambiguity();
  const col = compositionCollisions();
  const sweep = configSweep();
  const base = evaluate(BENCH, { mode: 'fallback', normalize: true });
  const single = evaluate(singleTermBench(), { mode: 'fallback', normalize: true });
  const pct = (x) => (x * 100).toFixed(1) + '%';

  console.log('═══ 方证对应与 AI：把「抓主症定主方」做成一次可复算的检索 ═══');
  console.log(`底座：${st.formulas} 首方 · ${st.herbs} 味药 · ${st.slots} 个药位 · ${st.chapters} 章 ${st.secs} 节`);

  console.log('\n── 一、抓主症定主方：一个主症圈多大（15 词）──');
  for (const a of amb) console.log(`  ${a.word}：${a.n} 首（${pct(a.coverage)}）· 跨 ${a.chapters} 章`);
  const meanN = amb.reduce((s, a) => s + a.n, 0) / amb.length;
  const meanCh = amb.reduce((s, a) => s + a.chapters, 0) / amb.length;
  console.log(`  平均：一个主症 圈 ${meanN.toFixed(1)} 首 / 跨 ${meanCh.toFixed(1)} 章 —— 单主症不能定主方`);

  console.log('\n── 二、主症→主方检索基线（14 例，取自教材24.1.1 / 24.1.2）──');
  for (const r of base.rows) {
    console.log(`  #${String(r.id).padStart(2)} ${r.terms.join('＋')} → ${r.gold}：rank=${r.rank == null ? '未进候选' : r.rank} · 候选 ${r.cand} · 前3 ${r.top.join('/') || '（空）'}`);
  }
  console.log(`  整串：召回@1 ${base.hit1}/${base.n}（${pct(base.recall1)}）· 召回@3 ${base.hit3}/${base.n}（${pct(base.recall3)}）· 平均候选 ${base.avgCand.toFixed(2)}`);
  console.log(`  经方组：@1 ${base.byGroup['经方'].hit1}/${base.byGroup['经方'].n} · @3 ${base.byGroup['经方'].hit3}/${base.byGroup['经方'].n}；时方组：@1 ${base.byGroup['时方'].hit1}/${base.byGroup['时方'].n} · @3 ${base.byGroup['时方'].hit3}/${base.byGroup['时方'].n}`);
  console.log(`  单主症（只取第一项）：召回@1 ${single.hit1}/${single.n}（${pct(single.recall1)}）· 召回@3 ${single.hit3}/${single.n}（${pct(single.recall3)}）· 平均候选 ${single.avgCand.toFixed(2)}`);
  console.log(`  漏检 ${base.miss} 例，其中零召回 ${base.zero} 例`);

  console.log('\n── 三、四种配置的召回对照（字段回退 / 术语归一 各救回多少）──');
  for (const s of sweep) {
    console.log(`  ${s.key}：@1 ${s.hit1}/14（${pct(s.recall1)}）· @3 ${s.hit3}/14（${pct(s.recall3)}）· 平均候选 ${s.avgCand.toFixed(2)}`);
  }

  console.log('\n── 四、主治字段审计：召回上限由字段完整度决定 ──');
  console.log(`  空主治 ${fa.empty} 首${fa.empty ? `（${fa.emptyNames.join('、')}）· 全在第${Object.keys(fa.emptyChapters).join('/')}章` : '（114/114 首全有字）'}`);
  const ch6 = FORMULAS.filter((f) => String(f.chapter) === '6');
  console.log(`  第6章 ${ch6.length} 首（曾整章为空，上游修复后已补全）：${ch6.map((f) => `${f.name} ${nonWs(f.zhuzhi)} 字`).join(' · ')}`);
  console.log(`  只给证名不列症状 ${fa.noZhengJian} 首 · 含「症见」${fa.withZhengJian} 首`);
  console.log(`  主治长度：最短 ${fa.lenMin} 字 · 中位 ${fa.lenMedian} 字 · 最长 ${fa.lenMax} 字（修复前为 6 / 53 / 127）`);
  console.log(`  药味集合相同的方组：${col.count} 组 —— 按药味判方在本数据上不撞车，但不等于配伍相同`);

  console.log('\n自检：');
  for (const c of selfCheck()) console.log(`  ${c.ok ? '✓' : '✗'} ${c.name}`);

  console.log('\n口径：召回率只说明「字面能不能命中」，不说明「方证对不对应」；命中率高的方也可能不是主方。');
  console.log('教学边界：本章只做方证检索基线的教学演示，不构成诊断/用药依据');
}

if (require.main === module) main();
module.exports = {
  DATA, FORMULAS, BENCH, SYMPTOM_WORDS, SYNONYMS, HEAD_ZONE, MIN_HITS,
  fold, nonWs, zhuZhiOf, termVariants, scoreFormula, retrieve, evaluate,
  singleTermBench, ambiguity, fieldAudit, compositionCollisions, structureIndex,
  configSweep, selfCheck,
};
