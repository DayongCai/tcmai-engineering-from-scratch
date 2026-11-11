'use strict';
/**
 * 方剂配伍的数据化：药物共现网络
 *
 *   node code/main.js
 *
 * 建模：
 *   · 节点 = 药味（归并后的药名）；边 = 同一首方内两味药共现；边权 = 共现的方数。
 *   · 每首方内部视为完全图：n 味药 → n(n−1)/2 对（方内重复药名先去重）。
 *   · 节点「入方数」= 该药出现在多少首方里；「加权度」= 相邻边权之和。
 *
 * 本章所有数字都由 standards/fangji/formulas.json 现算，不手打。
 *
 * 边界：
 *   · 完全图投影假设「同方即相关」，丢掉剂量、炮制、煎服法与君臣佐使——图里没有君臣佐使，只有共现；
 *   · 共现不是配伍（教材·第24章·24.2.1 已明说不能按词频共现连边做推理）；
 *   · 药名层仍有散文残串（见 notInLexiconStats），本章只统计、不修补数据。
 *
 * 上游修复（本章第二节「修复回执」核的就是这件事）：
 *   上一版抽取器漏抽三首方（六一散 / 生脉散 / 当归补血汤 各只剩 1 味）、四神丸抽成 0 味、
 *   消风散抓到《局方》同名方。本次重生成后 114/114 首均有组成，最短 2 味。
 */

const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '../../../../../..');
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/fangji/formulas.json'), 'utf8'));
const FORMULAS = DATA.formulas;
const ROLES = ['君', '臣', '佐', '使'];

/** 码点序比较：保证并列时的输出次序稳定、可复现（不用 locale，避免环境差异） */
const byName = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** 方内去重后的药名（一方内同一味药只连一次边） */
const herbNames = (f) => [...new Set(f.composition.herbs.map((h) => h.name))];

/** 药位总数：一方一药位，逐味计 */
const slotCount = (list = FORMULAS) => list.reduce((n, f) => n + f.composition.herbs.length, 0);

/** 去重药味数 */
const herbCount = (list = FORMULAS) => new Set(list.flatMap(herbNames)).size;

/** 平均药位/方 */
const avgSlots = (list = FORMULAS) => slotCount(list) / list.length;

/**
 * 构建共现网络
 * @returns {{nodes: Array, edges: Array, edgeCount: number, weightSum: number, possible: number, density: number}}
 */
function buildNetwork(list = FORMULAS) {
  const nodes = new Map();
  const edges = new Map();

  for (const f of list) {
    const hs = herbNames(f);
    for (const h of hs) {
      if (!nodes.has(h)) nodes.set(h, { name: h, formulas: [], slots: 0, degree: 0, weight: 0 });
      nodes.get(h).formulas.push(f.name);
    }
    for (const h of f.composition.herbs) nodes.get(h.name).slots += 1;
    for (let i = 0; i < hs.length; i += 1) {
      for (let j = i + 1; j < hs.length; j += 1) {
        const key = byName(hs[i], hs[j]) < 0 ? `${hs[i]}|${hs[j]}` : `${hs[j]}|${hs[i]}`;
        edges.set(key, (edges.get(key) || 0) + 1);
      }
    }
  }

  let weightSum = 0;
  for (const [key, w] of edges) {
    const [a, b] = key.split('|');
    nodes.get(a).degree += 1;
    nodes.get(a).weight += w;
    nodes.get(b).degree += 1;
    nodes.get(b).weight += w;
    weightSum += w;
  }

  const edgeList = [...edges.entries()]
    .map(([key, w]) => { const [a, b] = key.split('|'); return { a, b, w }; })
    .sort((x, y) => y.w - x.w || byName(x.a + x.b, y.a + y.b));

  const n = nodes.size;
  const possible = (n * (n - 1)) / 2;
  return {
    nodes: [...nodes.values()],
    edges: edgeList,
    edgeCount: edgeList.length,
    weightSum,
    possible,
    density: edgeList.length / possible,
  };
}

/** 按入方数排（度最高的药） */
const topByFormulas = (net, k = 10) =>
  net.nodes.slice().sort((a, b) => b.formulas.length - a.formulas.length || byName(a.name, b.name)).slice(0, k);

/** 按加权度排 */
const topByWeight = (net, k = 10) =>
  net.nodes.slice().sort((a, b) => b.weight - a.weight || byName(a.name, b.name)).slice(0, k);

/** 边权最高的药对 */
const topPairs = (net, k = 10) => net.edges.slice(0, k);

/** 君臣佐使角色分布：有抽取结果的方数 */
function roleDistribution(list = FORMULAS) {
  return ROLES.map((role) => {
    const n = list.filter((f) => (f.roles && f.roles[role] || []).length > 0).length;
    return { role, n, total: list.length, ratio: n / list.length };
  });
}

/** 四角色齐 / 三角色以上的方数 */
function roleDepth(list = FORMULAS) {
  const count = (f) => ROLES.filter((r) => (f.roles && f.roles[r] || []).length > 0).length;
  return {
    four: list.filter((f) => count(f) === 4).length,
    atLeast3: list.filter((f) => count(f) >= 3).length,
    total: list.length,
  };
}

/**
 * 单味药的角色足迹：它在各角色位各出现几次，以及「入了方却没标角色」几次。
 * 这是「度 ≠ 主药」的硬证据：度数只数入方数，角色足迹才看得见位置。
 */
function roleOfHerb(name, list = FORMULAS) {
  const out = { name, formulas: 0, 君: 0, 臣: 0, 佐: 0, 使: 0, unlabelled: 0, multi: 0 };
  for (const f of list) {
    if (!herbNames(f).includes(name)) continue;
    out.formulas += 1;
    const hit = ROLES.filter((r) => (f.roles && f.roles[r] || []).includes(name));
    for (const r of hit) out[r] += 1;
    if (!hit.length) out.unlabelled += 1;
    if (hit.length > 1) out.multi += 1;
  }
  return out;
}

/** 八法分布（按 formulas.json 的 bafa 层，一方归一法） */
function bafaDistribution() {
  const items = DATA.bafa.items.map((i) => ({ fa: i.fa, n: i.formulas, names: i.names || [] }));
  const total = items.reduce((n, i) => n + i.n, 0);
  return { items, total, outside: FORMULAS.length - total };
}

/** 长尾：只在一首方里出现的药 */
function tailStats(net) {
  const once = net.nodes.filter((n) => n.formulas.length === 1).length;
  return { once, total: net.nodes.length, ratio: once / net.nodes.length };
}

/**
 * 组成完整性审计：上游修复后的回执。
 * 全部由数据现算，只报事实，不改数据。
 */
function compositionAudit(list = FORMULAS) {
  const sizes = list.map((f) => ({ name: f.name, n: f.composition.herbs.length }));
  const withHerbs = sizes.filter((x) => x.n > 0).length;
  const min = Math.min(...sizes.map((x) => x.n));
  const max = Math.max(...sizes.map((x) => x.n));
  const hist = {};
  for (const x of sizes) hist[x.n] = (hist[x.n] || 0) + 1;
  return {
    total: list.length,
    withHerbs,
    empty: sizes.filter((x) => x.n === 0).map((x) => x.name),
    min,
    minNames: sizes.filter((x) => x.n === min).map((x) => x.name),
    max,
    maxNames: sizes.filter((x) => x.n === max).map((x) => x.name),
    hist,
  };
}

/** 五处已修缺陷的期望组成（取自 CHANGELOG 的修正确认值；用作断言，不作统计） */
const REPAIRED = [
  { name: '六一散', expect: ['滑石', '甘草'], why: '「原方组成为：」不在关键词表' },
  { name: '生脉散', expect: ['人参', '麦冬', '五味子'], why: '「组成与用量极简：」不匹配；`五味` 误伤 `五味子`' },
  { name: '当归补血汤', expect: ['黄芪', '当归'], why: '「原方组成极简，仅两味：」' },
  { name: '四神丸', expect: ['补骨脂', '肉豆蔻', '五味子', '吴茱萸'], why: '无「组成」二字，只有「原方用量为：」' },
  {
    name: '消风散',
    expect: ['当归', '生地', '防风', '蝉蜕', '知母', '苦参', '胡麻', '荆芥', '苍术', '牛蒡子', '石膏', '甘草', '木通'],
    why: '同段先讲《局方》同名方，初版抓到别人的方',
  },
];

/** 逐首核对五处缺陷是否真的修好（比对的是集合，不是顺序） */
function repairLedger(list = FORMULAS) {
  return REPAIRED.map((r) => {
    const f = list.find((x) => x.name === r.name);
    const got = f ? herbNames(f).sort(byName) : [];
    const want = r.expect.slice().sort(byName);
    const ok = !!f && got.length === want.length && got.every((h, i) => h === want[i]);
    return { name: r.name, why: r.why, ok, got: f ? f.composition.herbs.map((h) => h.name) : [], want: r.expect };
  });
}

/**
 * 药名词表边界：不在《中药学》287 味正名词表里的药名。
 * 其中「长度 ≥5 字或含虚词」的一类几乎必是方解散文被切成的残串（如「于清暑益气之外」）。
 */
function notInLexiconStats() {
  const map = DATA.notInZhongyaoLexicon || {};
  const names = Object.keys(map);
  const looksLikeProse = (k) => k.length >= 5 || /[之于而者也以为则]/.test(k);
  return {
    count: names.length,
    stated: DATA.counts ? DATA.counts.notInZhongyaoLexicon : null,
    prose: names.filter(looksLikeProse),
    top: names.slice().sort((a, b) => map[b] - map[a] || byName(a, b)).slice(0, 5)
      .map((k) => ({ name: k, n: map[k] })),
  };
}

/** 规模自检：任一数字与预期不符即抛错（不许静默通过） */
function selfCheck() {
  const net = buildNetwork();
  const bafa = bafaDistribution();
  const audit = compositionAudit();
  const lex = notInLexiconStats();
  const checks = [
    { name: '方数 114', ok: FORMULAS.length === 114, got: FORMULAS.length },
    { name: '药位 836', ok: slotCount() === 836, got: slotCount() },
    { name: '药味 246', ok: herbCount() === 246, got: herbCount() },
    { name: '不同药对 2364', ok: net.edgeCount === 2364, got: net.edgeCount },
    { name: '共现次数 3341', ok: net.weightSum === 3341, got: net.weightSum },
    { name: '可能边 30135', ok: net.possible === 30135, got: net.possible },
    { name: '归八法 52', ok: bafa.total === 52, got: bafa.total },
    { name: '不属八法 62', ok: bafa.outside === 62, got: bafa.outside },
    { name: '不在词表 86', ok: lex.count === 86, got: lex.count },
    { name: '114/114 首有组成', ok: audit.withHerbs === 114, got: audit.withHerbs },
    { name: '最短组成 2 味', ok: audit.min === 2, got: audit.min },
    { name: '五处缺陷全修好', ok: repairLedger().every((r) => r.ok), got: repairLedger().filter((r) => r.ok).length },
  ];
  const bad = checks.filter((c) => !c.ok);
  if (bad.length) throw new Error('规模自检失败：' + bad.map((b) => `${b.name}（实得 ${b.got}）`).join('；'));
  return checks;
}

function main() {
  const net = buildNetwork();
  const bafa = bafaDistribution();
  const roles = roleDistribution();
  const depth = roleDepth();
  const tail = tailStats(net);
  const audit = compositionAudit();
  const lex = notInLexiconStats();
  const n = FORMULAS.length;
  const num = (x) => x.toLocaleString('en-US');

  console.log('═══ 方剂配伍的数据化：药物共现网络 ═══');
  console.log(`规模：${n} 首方 · ${slotCount()} 个药位 · ${herbCount()} 味药 · 平均 ${avgSlots().toFixed(2)} 药位/方`);
  console.log(`组成：${audit.withHerbs}/${audit.total} 首有组成 · 最短 ${audit.min} 味（${audit.minNames.join('、')}）· 最长 ${audit.max} 味（${audit.maxNames.join('、')}）`);

  console.log('\n── 修复回执（五处缺陷，上游已修）──');
  for (const r of repairLedger()) {
    console.log(`  ${r.ok ? '✓' : '✗'} ${r.name}：${r.got.join('、') || '（无）'}（${r.got.length} 味） ← 原缺陷：${r.why}`);
  }
  console.log(`  结论：114/114 首有组成，0 首空组成，最短 2 味——上一版「三首方各只抽 1 味」的缺口已不存在。`);

  console.log(`\n共现网络：${num(net.edgeCount)} 对不同药 · ${num(net.weightSum)} 次共现（边权之和）`);
  console.log(`  可能边 ${num(net.possible)} · 密度 ${(net.density * 100).toFixed(2)}% · 平均每方 ${(net.weightSum / n).toFixed(2)} 次共现`);
  console.log(`  完全图投影：每方 n 味药贡献 C(n,2) 次共现（${audit.max} 味 → C(${audit.max},2)=${(audit.max * (audit.max - 1)) / 2}）`);

  console.log('\n入方数前 6（入方数 / 加权度）：');
  for (const x of topByFormulas(net, 6)) {
    console.log(`  ${x.name}：${x.formulas.length} 首 / 加权度 ${x.weight}`);
  }

  console.log('\n药对前 5（共现方数；并列次序按药名码点）：');
  for (const e of topPairs(net, 5)) console.log(`  ${e.a}+${e.b}：${e.w}`);
  const withGancao = topPairs(net, 10).filter((e) => e.a === '甘草' || e.b === '甘草').length;
  console.log(`  前 10 名中 ${withGancao} 对含甘草——这是「使药横向通用」的痕迹，不是「主药」的证据`);

  console.log('\n君臣佐使角色分布（有抽取结果的方数 / 114）：');
  for (const r of roles) console.log(`  ${r.role} ${r.n} 首（${(r.ratio * 100).toFixed(1)}%）`);
  console.log(`  四角色齐 ${depth.four} 首 · 三角色以上 ${depth.atLeast3} 首`);

  const gc = roleOfHerb('甘草');
  console.log(`\n甘草的角色足迹（入方 ${gc.formulas} 首）：使 ${gc.使} · 佐 ${gc.佐} · 君 ${gc.君} · 臣 ${gc.臣} · 未标角色 ${gc.unlabelled}`);
  console.log(`  一味兼两角 ${gc.multi} 首（故角色计数之和可略大于入方数）`);

  console.log(`\n归八法 ${bafa.total} 首（${bafa.items.map((i) => i.fa + i.n).join(' ')}）· 不属八法 ${bafa.outside} 首`);

  console.log(`\n长尾：${tail.once}/${tail.total} 味药只出现在 1 首方里（${(tail.ratio * 100).toFixed(1)}%）`);

  console.log(`\n词表边界：${lex.count} 味不在《中药学》287 味正名词表（其中 ${lex.prose.length} 条长度 ≥5 字或含虚词，几乎必是方解散文残串）`);
  console.log(`  出现最多的词表外药名：${lex.top.map((x) => x.name + ' ' + x.n).join(' · ')}`);

  console.log('\n自检：');
  for (const c of selfCheck()) console.log(`  ${c.ok ? '✓' : '✗'} ${c.name}`);

  console.log('\n口径：度中心性只说明「广谱」，不说明「主药」；共现只说明「同方出现」，不说明配伍关系。');
  console.log('教学边界：本章只做共现网络的描述性统计，不构成诊断/用药依据');
}

if (require.main === module) main();
module.exports = {
  DATA, FORMULAS, ROLES, REPAIRED, herbNames, slotCount, herbCount, avgSlots, buildNetwork,
  topByFormulas, topByWeight, topPairs, roleDistribution, roleDepth, roleOfHerb,
  bafaDistribution, tailStats, compositionAudit, repairLedger, notInLexiconStats, selfCheck,
};
