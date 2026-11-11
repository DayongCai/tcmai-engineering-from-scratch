#!/usr/bin/env node
/**
 * 方剂学 · 第 6 章 温里剂与补益剂 —— 温与补，只差一味
 * 课程: departments/02-zhongyao/03-fangjixue/chapters/06-wenli-buyi/docs/zh.md
 * 数据: standards/fangji/formulas.json（教材第 10 章温里剂 5 方 + 第 12 章补益剂 11 方）
 * 依赖: 仅 Node.js 标准库
 *
 * 做法: 把每首方读成药味集合，做三件事：
 *       ① 差分（A−B / B−A）——看「温」与「补」到底差哪一味；
 *       ② 并集验证——看「相合而成」的合方能否逐味对上；
 *       ③ 子集判定 + 完整性前置——单味残方不参与，否则会伪造合方边。
 * 所有数字现算；输出不构成任何诊疗建议。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTERS = ['10', '12'];
const RELS = [
  '../../../../../standards/fangji/formulas.json',
  '../../../../standards/fangji/formulas.json',
];

function findDataFile() {
  for (const rel of RELS) {
    const direct = path.join(__dirname, rel);
    if (fs.existsSync(direct)) return direct;
  }
  let dir = __dirname;
  for (let i = 0; i < 8; i += 1) {
    const p = path.join(dir, 'standards', 'fangji', 'formulas.json');
    if (fs.existsSync(p)) return p;
    dir = path.dirname(dir);
  }
  throw new Error('找不到 standards/fangji/formulas.json');
}

const loadFormulas = () => JSON.parse(fs.readFileSync(findDataFile(), 'utf8')).formulas;

/** 药名判据：2–4 字且不含虚词；残句（「法上为」「缩砂仁」之外的交代文字）不算药 */
// 「味」是残句判据里的高频字（「三味」「为末」…），但五味子是真药名，必须排除
const isNoise = (name) => name.length < 2 || name.length > 4 || (/[为故而无另自三于]/.test(name) || (name.includes('味') && name !== '五味子'));
const herbsRaw = (f) => f.composition.herbs.map((h) => h.name);
const herbsOf = (f) => herbsRaw(f).filter((n) => !isNoise(n));
const noiseOf = (f) => herbsRaw(f).filter(isNoise);

function stats(list) {
  let rawSlots = 0;
  let noise = 0;
  const uniq = new Set();
  for (const f of list) {
    rawSlots += herbsRaw(f).length;
    noise += noiseOf(f).length;
    for (const h of herbsOf(f)) uniq.add(h);
  }
  return {
    formulas: list.length,
    rawSlots,
    noise,
    slots: rawSlots - noise,
    unique: uniq.size,
    avgHerbs: (rawSlots - noise) / list.length,
  };
}

const set = (f) => new Set(herbsOf(f));
const inter = (A, B) => [...A].filter((x) => B.has(x));

function jaccard(a, b) {
  const A = set(a);
  const B = set(b);
  return inter(A, B).length / new Set([...A, ...B]).size;
}

/** 两方差分：共有 / 只在 A / 只在 B */
function diffPair(a, b) {
  const A = set(a);
  const B = set(b);
  return {
    a: a.name,
    b: b.name,
    shared: inter(A, B),
    onlyA: [...A].filter((x) => !B.has(x)),
    onlyB: [...B].filter((x) => !A.has(x)),
    j: Number(jaccard(a, b).toFixed(2)),
  };
}

function nearestPairs(list, k = 5) {
  const out = [];
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const A = set(list[i]);
      const B = set(list[j]);
      const shared = inter(A, B);
      out.push({
        a: list[i].name,
        b: list[j].name,
        j: Number(jaccard(list[i], list[j]).toFixed(2)),
        shared: shared.length,
        union: new Set([...A, ...B]).size,
        subset: shared.length === Math.min(A.size, B.size),
      });
    }
  }
  return out.sort((x, y) => y.j - x.j || x.a.localeCompare(y.a, 'zh')).slice(0, k);
}

/**
 * 子集判定带完整性前置：子集方药味 < 3 的，跳过并记入 skipped。
 * 本章生脉散、当归补血汤各只剩 2 味（前者是「五味子」被虚词判据误伤，
 * 后者本就只有黄芪、当归两味），若放行仍会伪造假边，故一并跳过。
 */
function subsetPairs(list) {
  const out = [];
  const skipped = [];
  for (let i = 0; i < list.length; i += 1) {
    const A = set(list[i]);
    if (A.size < 3) {
      skipped.push({ name: list[i].name, size: A.size });
      continue;
    }
    for (let j = 0; j < list.length; j += 1) {
      if (i === j) continue;
      const B = set(list[j]);
      if (A.size < B.size && inter(A, B).length === A.size) {
        out.push({ small: list[i].name, big: list[j].name, size: A.size, bigSize: B.size });
      }
    }
  }
  return { edges: out.sort((x, y) => x.small.localeCompare(y.small, 'zh') || x.big.localeCompare(y.big, 'zh')), skipped };
}

/** 合方验证：若干方的并集与目标方逐味比对 */
function unionTest(members, target) {
  const u = new Set();
  for (const m of members) for (const h of herbsOf(m)) u.add(h);
  const T = set(target);
  return {
    union: [...u].sort((x, y) => x.localeCompare(y, 'zh')),
    target: [...T].sort((x, y) => x.localeCompare(y, 'zh')),
    covered: [...u].filter((h) => T.has(h)),
    missing: [...u].filter((h) => !T.has(h)),
    extra: [...T].filter((h) => !u.has(h)),
  };
}

function bySection(list) {
  const m = new Map();
  for (const f of list) {
    const s = m.get(f.sec) || { sec: f.sec, n: 0, slots: 0, names: [] };
    s.n += 1;
    s.slots += herbsOf(f).length;
    s.names.push(f.name);
    m.set(f.sec, s);
  }
  return [...m.values()]
    .map((s) => ({ ...s, avg: s.slots / s.n }))
    .sort((a, b) => a.sec.localeCompare(b.sec, 'zh'));
}

function coreHerbs(list, min = 3) {
  const cnt = new Map();
  for (const f of list) for (const h of new Set(herbsOf(f))) cnt.set(h, (cnt.get(h) || 0) + 1);
  return [...cnt]
    .filter(([, v]) => v >= min)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'))
    .map(([name, n]) => ({ name, n }));
}

function roleCoverage(list) {
  const cov = { 君: 0, 臣: 0, 佐: 0, 使: 0 };
  for (const f of list) for (const r of Object.keys(cov)) if ((f.roles[r] || []).length) cov[r] += 1;
  const full4 = list.filter((f) => ['君', '臣', '佐', '使'].every((r) => (f.roles[r] || []).length));
  const none = list.filter((f) => ['君', '臣', '佐', '使'].every((r) => !(f.roles[r] || []).length));
  return { cov, full4, none };
}

function main() {
  const all = loadFormulas();
  const list = all.filter((f) => CHAPTERS.includes(f.chapter));
  const s = stats(list);
  const byName = (n) => list.find((f) => f.name === n);
  const wen = list.filter((f) => f.fa === '温');
  const bu = list.filter((f) => f.fa === '补');
  const cov = roleCoverage(list);
  const subs = subsetPairs(list);

  console.log('═══ 温里剂与补益剂：温与补，只差一味（方剂学 第6章）═══');
  console.log(`数据: ${path.basename(findDataFile())} · 全库 ${all.length} 方 · 本章取教材第 ${CHAPTERS.join('、')} 章`);
  console.log(`规模: ${s.formulas} 方 / ${s.slots} 药位 / 去重 ${s.unique} 味 / 每方平均 ${s.avgHerbs.toFixed(1)} 味`);
  console.log(`抽取残句: ${s.noise} 条已剔出（原始药位 ${s.rawSlots}）`);
  console.log(`分法: 温 ${wen.length} 方（${stats(wen).slots} 药位，平均 ${stats(wen).avgHerbs.toFixed(1)} 味）/ 补 ${bu.length} 方（${stats(bu).slots} 药位，平均 ${stats(bu).avgHerbs.toFixed(1)} 味）`);

  console.log('— 逐节 —');
  for (const sec of bySection(list)) {
    console.log(`  ${sec.sec}: ${sec.n} 方 / ${sec.slots} 药位 / 平均 ${sec.avg.toFixed(1)} 味 → ${sec.names.join('、')}`);
  }

  console.log('— 温与补的最小差分：理中丸 vs 四君子汤 —');
  const d1 = diffPair(byName('理中丸'), byName('四君子汤'));
  console.log(`  共有 ${d1.shared.join('、')}（${d1.shared.length}）· Jaccard ${d1.j.toFixed(2)}`);
  console.log(`  理中丸独有: ${d1.onlyA.join('、') || '无'} · 四君子汤独有: ${d1.onlyB.join('、') || '无'}`);

  console.log('— 合方验证：八珍汤 vs 四君子汤 ∪ 四物汤 —');
  const ut = unionTest([byName('四君子汤'), byName('四物汤')], byName('八珍汤'));
  console.log(`  两方并集 ${ut.union.length} 味: ${ut.union.join('、')}`);
  console.log(`  八珍汤 ${ut.target.length} 味: ${ut.target.join('、')}`);
  console.log(`  对上 ${ut.covered.length}/${ut.union.length} · 缺 ${ut.missing.join('、') || '无'} · 八珍多出 ${ut.extra.join('、') || '无'}`);

  console.log('— 同源验证：六味地黄丸 vs 肾气丸 —');
  const d2 = diffPair(byName('六味地黄丸'), byName('肾气丸'));
  console.log(`  共有 ${d2.shared.join('、')}（${d2.shared.length}）· Jaccard ${d2.j.toFixed(2)}`);
  console.log(`  六味独有: ${d2.onlyA.join('、') || '无'} · 肾气独有: ${d2.onlyB.join('、') || '无'}`);

  console.log('— 核心药（频次 ≥ 3）—');
  for (const h of coreHerbs(list, 3)) console.log(`  ${h.name} ${h.n} 方`);

  console.log('— Jaccard 最近邻前 5 对 —');
  for (const p of nearestPairs(list, 5)) {
    console.log(`  ${p.a} ~ ${p.b}: ${p.j.toFixed(2)}（共 ${p.shared} / 并 ${p.union}）${p.subset ? ' ← 子集' : ''}`);
  }

  console.log('— 真子集边（已做完整性前置）—');
  for (const p of subs.edges) console.log(`  ${p.small}（${p.size} 味）⊂ ${p.big}（${p.bigSize} 味）`);
  console.log(`  跳过残缺方 ${subs.skipped.length} 首: ${subs.skipped.map((k) => `${k.name}（${k.size} 味）`).join('、')}`);

  console.log('— 君臣佐使抽取覆盖 —');
  console.log(`  君 ${cov.cov['君']} / 臣 ${cov.cov['臣']} / 佐 ${cov.cov['佐']} / 使 ${cov.cov['使']} · 四角色齐 ${cov.full4.length} 方 · 全空 ${cov.none.length} 方`);

  console.log('教学边界：本章只做教材方剂的结构统计与集合代数对照，用于教学演示；不构成诊断/用药依据。');
}

if (require.main === module) main();

module.exports = {
  CHAPTERS,
  findDataFile,
  loadFormulas,
  isNoise,
  herbsOf,
  noiseOf,
  stats,
  jaccard,
  diffPair,
  nearestPairs,
  subsetPairs,
  unionTest,
  bySection,
  coreHerbs,
  roleCoverage,
  main,
};
