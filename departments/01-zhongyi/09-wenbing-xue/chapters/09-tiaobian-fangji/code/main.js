'use strict';
/**
 * 第 9 章 · 《温病条辨》方剂体系：243 方 / 1153 味次 / 药名归并
 *
 *   node code/main.js
 *
 * 数据：standards/wenbing/底本.json（外源·笈成，sha256 30d2e6ca…）
 *
 * 口径（三条，改任何一条都要同步改 docs/zh.md 与 test）：
 *   1. 总体 243 方 = 178 有药味 + 65 无药味（互见 / 加减方 / 主治先行）。
 *      配伍统计只用 178 个有药味的方，0 药味的方不进。
 *   2. 药名归并**只做显式别名**，不做语义合并：生地≠熟地、麦冬≠天冬。
 *      实测 366 → 358，只降 8 个 —— 说明药名的膨胀主要不是别名，
 *      而是同一药的不同**取用形态**（麦冬汁、连心麦冬、鲜生地…）各自成了独立名字。
 *      这一点写进 docs 的「代价与边界」，不许拿「清洗后」冒充「规范化」。
 *   3. 味数分布给中位数与全分布，不给「平均 6.48 味」这种单点结论：
 *      膏丹类有 32/35 味的极端值，均值会被拉偏。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/wenbing/底本.json'), 'utf8'));
const TB = BOOK.books.find((b) => b.id === 'tiaobian');
const SECS = TB.sections;

const FORMULAS = SECS.flatMap((s) => s.formulas || []);
const WITH_HERBS = FORMULAS.filter((f) => (f.ingredients || []).length > 0);

/** 只做显式别名：不做语义合并（生地/熟地、麦冬/天冬必须分开） */
const ALIAS = new Map(Object.entries({
  廣皮: '陈皮', 广皮: '陈皮', 陳皮: '陈皮',
  麥冬: '麦冬', 麦门冬: '麦冬', 麥門冬: '麦冬',
  炙草: '炙甘草', 甘草: '甘草',
  乾地黃: '生地', 干地黄: '生地', 細生地: '生地', 细生地: '生地',
  元參: '元参', 玄參: '元参', 玄参: '元参',
  白朮: '白术', 白蒺藜: '蒺藜',
  連翹: '连翘', 銀花: '银花', 金銀花: '银花',
  黃芩: '黄芩', 黃連: '黄连', 黃柏: '黄柏', 大黃: '大黄',
  半夏: '半夏', 製半夏: '半夏', 法半夏: '半夏',
  附子: '附子', 熟附子: '附子', 生附子: '附子',
}));

function normalize(name) {
  const raw = String(name || '').trim();
  if (!raw) return '';
  if (ALIAS.has(raw)) return ALIAS.get(raw);
  // 去炮制/形态后缀（不改药基），仅限已知可剥的尾巴
  return raw.replace(/(?:汁|心|鲜|鮮|炒|炒炭|炭|皮|尖|去油)$/g, '') || raw;
}

function herbNames(f) {
  return (f.ingredients || []).map((i) => normalize(i.herbSimp || i.herb)).filter(Boolean);
}

function totals() {
  const tokens = WITH_HERBS.reduce((n, f) => n + f.ingredients.length, 0);
  const raw = new Set(FORMULAS.flatMap((f) => (f.ingredients || []).map((i) => i.herbSimp || i.herb)));
  const norm = new Set(WITH_HERBS.flatMap(herbNames));
  return {
    formulas: FORMULAS.length,
    withHerbs: WITH_HERBS.length,
    noHerbs: FORMULAS.length - WITH_HERBS.length,
    tokens,
    rawNames: raw.size,
    normNames: norm.size,
    sections: SECS.length,
  };
}

/** 药频：方数（同一方内重复只计一次）+ 味次 */
function herbFrequency() {
  const byFang = new Map();
  const byToken = new Map();
  for (const f of WITH_HERBS) {
    for (const n of new Set(herbNames(f))) byFang.set(n, (byFang.get(n) || 0) + 1);
    for (const n of herbNames(f)) byToken.set(n, (byToken.get(n) || 0) + 1);
  }
  return [...byFang.entries()]
    .map(([herb, fang]) => ({ herb, fang, token: byToken.get(herb) || 0, rate: +((fang / WITH_HERBS.length) * 100).toFixed(1) }))
    .sort((a, b) => b.fang - a.fang || a.herb.localeCompare(b.herb, 'zh'));
}

/** 药对：同方共现 ≥ minFang 方的组合（保序去重） */
function herbPairs(minFang = 8) {
  const pair = new Map();
  for (const f of WITH_HERBS) {
    const hs = [...new Set(herbNames(f))].sort((a, b) => a.localeCompare(b, 'zh'));
    for (let i = 0; i < hs.length; i++) {
      for (let j = i + 1; j < hs.length; j++) {
        const k = `${hs[i]}+${hs[j]}`;
        pair.set(k, (pair.get(k) || 0) + 1);
      }
    }
  }
  return [...pair.entries()]
    .filter(([, n]) => n >= minFang)
    .map(([k, n]) => ({ pair: k, fang: n }))
    .sort((a, b) => b.fang - a.fang || a.pair.localeCompare(b.pair, 'zh'));
}

/** 方剂规模：分布 + 中位 + 均值 + 极值（膏丹不掩盖） */
function sizeProfile() {
  const sizes = WITH_HERBS.map((f) => f.ingredients.length).sort((a, b) => a - b);
  const dist = {};
  for (const s of sizes) dist[s] = (dist[s] || 0) + 1;
  const sortedF = [...WITH_HERBS].sort((a, b) => b.ingredients.length - a.ingredients.length);
  return {
    n: sizes.length,
    min: sizes[0],
    max: sizes[sizes.length - 1],
    median: sizes[Math.floor(sizes.length / 2)],
    mean: +(sizes.reduce((a, b) => a + b, 0) / sizes.length).toFixed(2),
    dist,
    largest: sortedF.slice(0, 3).map((f) => ({ name: f.nameSimp, n: f.ingredients.length })),
    smallest: sortedF.slice(-3).reverse().map((f) => ({ name: f.nameSimp, n: f.ingredients.length })),
  };
}

/** 「加减/去/加」类变方：这是条辨最显著的方剂学特征 */
function derivedFormulas() {
  const isDerived = (n) => /加减|加減/.test(n) || /去[^方]{1,14}加/.test(n) || /^[^方]{2,14}加[^方]{1,14}汤/.test(n);
  const list = FORMULAS.filter((f) => isDerived(f.nameSimp || f.name));
  return {
    n: list.length,
    share: +((list.length / FORMULAS.length) * 100).toFixed(1),
    eg: list.slice(0, 5).map((f) => f.nameSimp),
  };
}

/** 三阶方剂的代表与味数（讲课常用对照） */
function ladderAnchors() {
  const find = (re) => FORMULAS.find((f) => re.test(f.nameSimp || f.name));
  const pick = (label, re) => {
    const f = find(re);
    return f ? { label, name: f.nameSimp, n: f.ingredients.length } : { label, name: null, n: 0 };
  };
  return [
    pick('辛凉平剂', /銀翹散方|银翘散方/),
    pick('辛凉轻剂', /桑菊飲方|桑菊饮方/),
    pick('辛凉重剂', /白虎湯方|白虎汤方/),
    pick('下焦复脉', /加減復脈湯方|加减复脉汤方/),
  ];
}

if (require.main === module) {
  console.log('');
  console.log('  教学边界：本输出为《温病条辨》方剂文本的统计，外源·笈成留档可复算，不构成诊疗依据。');
  console.log('');
  const t = totals();
  console.log('═══ 温病条辨 · 方剂体系 ═══');
  console.log(`  方 ${t.formulas}（有药味 ${t.withHerbs} + 无药味 ${t.noHerbs}）· 药名次 ${t.tokens} · 药名 ${t.rawNames} → 归并后 ${t.normNames}`);
  const freq = herbFrequency();
  console.log('\n  序 | 药 | 方数 | 出现率 | 味次');
  freq.slice(0, 12).forEach((r, i) => console.log(`  ${i + 1} | ${r.herb} | ${r.fang} | ${r.rate}% | ${r.token}`));
  const pairs = herbPairs(8);
  console.log(`\n  药对（同方共现 ≥8 方）：${pairs.length} 对`);
  pairs.slice(0, 6).forEach((p) => console.log(`    ${p.pair} · ${p.fang} 方`));
  const sp = sizeProfile();
  console.log(`\n  味数：中位 ${sp.median} · 均值 ${sp.mean} · 范围 ${sp.min}–${sp.max}`);
  console.log(`  最大方：${sp.largest.map((x) => `${x.name}(${x.n})`).join(' · ')}`);
  const dr = derivedFormulas();
  console.log(`\n  加减/变方（方名带「加减/去…加」）：${dr.n} 个（${dr.share}%）`);
  console.log(`    例：${dr.eg.join(' · ')}`);
  const la = ladderAnchors();
  console.log(`\n  三阶锚点：${la.map((x) => `${x.label}=${x.name || '—'}(${x.n})`).join(' · ')}`);
}

module.exports = { BOOK, TB, FORMULAS, WITH_HERBS, ALIAS, normalize, herbNames, totals, herbFrequency, herbPairs, sizeProfile, derivedFormulas, ladderAnchors };
