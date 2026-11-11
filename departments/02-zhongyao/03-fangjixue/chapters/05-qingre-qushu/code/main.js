#!/usr/bin/env node
/**
 * 方剂学 · 第 5 章 清热剂与祛暑剂 —— 六节不是一条直线
 * 课程: departments/02-zhongyao/03-fangjixue/chapters/05-qingre-qushu/docs/zh.md
 * 数据: standards/fangji/formulas.json（教材第 8 章清热剂 13 方 + 第 9 章祛暑剂 3 方）
 * 依赖: 仅 Node.js 标准库
 *
 * 做法: ① 统计六节的药位与方数；② 假设「节序 = 热势深浅」并检验这个假设（Pearson r）；
 *       ③ 用 Jaccard 找最近邻、用真子集找合方；④ 报出子集判定的两头：曾经的假子集与
 *          当前的漏边（六一散的味道由上游抽取器补齐后，假子集归零）。
 * 所有数字现算；输出不构成任何诊疗建议。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTERS = ['8', '9'];
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

/** 药名判据：2–4 字且不含虚词；残句（如「而配伍之要尤在」「集寒凉之力于一」）不算药 */
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

function bySection(list) {
  const m = new Map();
  for (const f of list) {
    const s = m.get(f.sec) || { sec: f.sec, n: 0, slots: 0, names: [] };
    s.n += 1;
    s.slots += herbsOf(f).length;
    s.names.push(f.name);
    m.set(f.sec, s);
  }
  // 按教材编排顺序返回（8.1 → 8.5 → 9.1），而不是按出现顺序
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
    .map(([name, n]) => ({ name, n, where: list.filter((f) => herbsOf(f).includes(name)).map((f) => f.name) }));
}

const set = (f) => new Set(herbsOf(f));
const inter = (A, B) => [...A].filter((x) => B.has(x));

function jaccard(a, b) {
  const A = set(a);
  const B = set(b);
  return inter(A, B).length / new Set([...A, ...B]).size;
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

function subsetPairs(list) {
  const out = [];
  for (let i = 0; i < list.length; i += 1) {
    for (let j = 0; j < list.length; j += 1) {
      if (i === j) continue;
      const A = set(list[i]);
      const B = set(list[j]);
      if (A.size >= 1 && A.size < B.size && inter(A, B).length === A.size) {
        out.push({ small: list[i].name, big: list[j].name, size: A.size, bigSize: B.size });
      }
    }
  }
  return out.sort((x, y) => x.small.localeCompare(y.small, 'zh') || x.big.localeCompare(y.big, 'zh'));
}

function roleCoverage(list) {
  const cov = { 君: 0, 臣: 0, 佐: 0, 使: 0 };
  for (const f of list) for (const r of Object.keys(cov)) if ((f.roles[r] || []).length) cov[r] += 1;
  const full4 = list.filter((f) => ['君', '臣', '佐', '使'].every((r) => (f.roles[r] || []).length));
  const none = list.filter((f) => ['君', '臣', '佐', '使'].every((r) => !(f.roles[r] || []).length));
  return { cov, full4, none };
}

/** Pearson 相关系数；分母为 0 时返回 null（不返回 0，避免把「算不了」说成「无相关」） */
function pearson(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  return sxx === 0 || syy === 0 ? null : sxy / Math.sqrt(sxx * syy);
}

/**
 * 待检验的假设（不是事实）：教材六节的编排顺序 = 热势由浅入深。
 * 若假设成立，节序与每节平均药位应当同向变化。
 */
function depthTest(list) {
  const secs = bySection(list);
  const rank = secs.map((_, i) => i + 1);
  const avg = secs.map((s) => s.avg);
  return { secs, rank, avg, r: pearson(rank, avg) };
}

function main() {
  const all = loadFormulas();
  const list = all.filter((f) => CHAPTERS.includes(f.chapter));
  const s = stats(list);
  const depth = depthTest(list);
  const cov = roleCoverage(list);
  const qing = list.filter((f) => f.chapter === '8');
  const shu = list.filter((f) => f.chapter === '9');

  console.log('═══ 清热剂与祛暑剂：热在哪一层（方剂学 第5章）═══');
  console.log(`数据: ${path.basename(findDataFile())} · 全库 ${all.length} 方 · 本章取教材第 ${CHAPTERS.join('、')} 章`);
  console.log(`规模: ${s.formulas} 方 / ${s.slots} 药位 / 去重 ${s.unique} 味 / 每方平均 ${s.avgHerbs.toFixed(1)} 味`);
  console.log(`抽取残句: ${s.noise} 条已剔出（原始药位 ${s.rawSlots}）`);
  console.log(`分章: 第 8 章清热 ${qing.length} 方 / 第 9 章祛暑 ${shu.length} 方`);

  console.log('— 逐节：方数 / 药位 / 平均 —');
  for (const sec of depth.secs) {
    console.log(`  ${sec.sec}: ${sec.n} 方 / ${sec.slots} 药位 / 平均 ${sec.avg.toFixed(1)} 味 → ${sec.names.join('、')}`);
  }

  console.log('— 假设检验：节序 = 热势深浅？—');
  console.log(`  节序 vs 平均药位 Pearson r = ${depth.r === null ? 'null（无方差）' : depth.r.toFixed(2)}`);
  console.log('  解读: |r| 越小，越不能把「节序」当作「热势深浅」的数值刻度。');

  console.log('— 核心药（频次 ≥ 3）—');
  for (const h of coreHerbs(list, 3)) console.log(`  ${h.name} ${h.n} 方: ${h.where.join('、')}`);

  console.log('— Jaccard 最近邻前 5 对 —');
  for (const p of nearestPairs(list, 5)) {
    console.log(`  ${p.a} ~ ${p.b}: ${p.j.toFixed(2)}（共 ${p.shared} / 并 ${p.union}）${p.subset ? ' ← 子集' : ''}`);
  }

  console.log('— 真子集对（合方/相合而成）—');
  const subs = subsetPairs(list);
  for (const p of subs) console.log(`  ${p.small}（${p.size} 味）⊂ ${p.big}（${p.bigSize} 味）`);
  if (!subs.length) console.log('  （0 条：本章没有可判为合方的真子集边）');

  console.log('— 子集判定的两头：假边与漏边 —');
  const ly = list.find((f) => f.name === '六一散');
  console.log(`  六一散现抽到 ${herbsOf(ly).length} 味：${herbsOf(ly).join('、')}`);
  console.log('  上游修复前它只抽到甘草 1 味，{甘草} 会成为任何含甘草方的子集，伪造 7 条边；');
  console.log('  滑石补齐后假边归零——子集判定先要问「子集方自身是否完整」。');
  const dc = list.find((f) => f.name === '导赤散');
  const ldl = list.find((f) => f.name === '龙胆泻肝汤');
  const missed = herbsOf(dc).filter((h) => !herbsOf(ldl).includes(h));
  console.log(`  反方向的漏边：导赤散 ${herbsOf(dc).length} 味 ⊄ 龙胆泻肝汤 ${herbsOf(ldl).length} 味，差在 ${missed.join('、')}（「生甘草梢」未归并为「甘草」）。`);

  console.log('— 君臣佐使抽取覆盖 —');
  console.log(`  君 ${cov.cov['君']} / 臣 ${cov.cov['臣']} / 佐 ${cov.cov['佐']} / 使 ${cov.cov['使']} · 四角色齐 ${cov.full4.length} 方 · 全空 ${cov.none.length} 方`);

  console.log('教学边界：本章只做教材方剂的结构统计与假设检验，用于教学演示；不构成诊断/用药依据。');
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
  bySection,
  coreHerbs,
  jaccard,
  nearestPairs,
  subsetPairs,
  roleCoverage,
  pearson,
  depthTest,
  main,
};
