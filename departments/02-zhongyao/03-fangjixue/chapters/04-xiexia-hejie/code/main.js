#!/usr/bin/env node
/**
 * 方剂学 · 第 4 章 泻下剂与和解剂 —— 类方鉴别的集合解法
 * 课程: departments/02-zhongyao/03-fangjixue/chapters/04-xiexia-hejie/docs/zh.md
 * 数据: standards/fangji/formulas.json（教材第 6 章泻下剂 6 方 + 第 7 章和解剂 5 方）
 * 依赖: 仅 Node.js 标准库
 *
 * 做法: 把每首方读成一味药的集合，用 Jaccard 相似度找「最近邻」，用子集关系找「合方」。
 *       所有数字现算，不手打；输出只描述教材里的方剂结构，不构成任何用药建议。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTERS = ['6', '7'];
const RELS = [
  '../../../../../standards/fangji/formulas.json', // chapters/<slug>/code → 仓库根 5 级
  '../../../../standards/fangji/formulas.json',   // 契约写法（4 级）
];

/** 先按相对路径试；都对不上再逐级上溯找 standards/fangji/formulas.json */
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

/**
 * 组成抽取的噪声判据：药名为 2–4 字，且不含虚词。
 * 「同书卷十五另载」「无当归」「而配伍之要尤在」这类是抽取切分留下的残句，不是药。
 * 判据写在代码里而不是临时手删，才能被单测复现。
 */
const isNoise = (name) => name.length < 2 || name.length > 4 || /[为故而无另自三味于]/.test(name);

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
  const cleanSlots = rawSlots - noise;
  return {
    formulas: list.length,
    rawSlots,
    noise,
    slots: cleanSlots,
    unique: uniq.size,
    avgHerbs: cleanSlots / list.length,
  };
}

/** 频次 ≥ min 的药，按频次降序；同频按药名排序，保证输出稳定 */
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
const union = (A, B) => new Set([...A, ...B]);

function jaccard(a, b) {
  const A = set(a);
  const B = set(b);
  const i = inter(A, B).length;
  return i / union(A, B).size;
}

/** 同一治法内按 Jaccard 排序的最近邻对（类方鉴别的机器版） */
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
        union: union(A, B).size,
        subset: shared.length === Math.min(A.size, B.size),
      });
    }
  }
  return out.sort((x, y) => y.j - x.j || x.a.localeCompare(y.a, 'zh')).slice(0, k);
}

/** 真子集对：一方全部药味出现在另一方里 —— 这就是教材说的「合方」「相合而成」 */
function subsetPairs(list) {
  const out = [];
  for (let i = 0; i < list.length; i += 1) {
    for (let j = 0; j < list.length; j += 1) {
      if (i === j) continue;
      const A = set(list[i]);
      const B = set(list[j]);
      if (A.size >= 3 && A.size < B.size && inter(A, B).length === A.size) {
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

function bySection(list) {
  const m = new Map();
  for (const f of list) {
    const s = m.get(f.sec) || { sec: f.sec, n: 0, slots: 0, names: [] };
    s.n += 1;
    s.slots += herbsOf(f).length;
    s.names.push(f.name);
    m.set(f.sec, s);
  }
  return [...m.values()].map((s) => ({ ...s, avg: s.slots / s.n }));
}

function main() {
  const all = loadFormulas();
  const list = all.filter((f) => CHAPTERS.includes(f.chapter));
  const s = stats(list);
  const cov = roleCoverage(list);
  const fa = new Map();
  for (const f of list) {
    const k = f.fa || '（未归法）';
    const v = fa.get(k) || { fa: k, n: 0, slots: 0, names: [] };
    v.n += 1;
    v.slots += herbsOf(f).length;
    v.names.push(f.name);
    fa.set(k, v);
  }

  console.log('═══ 泻下剂与和解剂：类方鉴别的集合解法（方剂学 第4章）═══');
  console.log(`数据: ${path.basename(findDataFile())} · 全库 ${all.length} 方 · 本章取教材第 ${CHAPTERS.join('、')} 章`);
  console.log(`规模: ${s.formulas} 方 / ${s.slots} 药位 / 去重 ${s.unique} 味 / 每方平均 ${s.avgHerbs.toFixed(1)} 味`);
  console.log(`抽取残句: ${s.noise} 条已剔出（原始药位 ${s.rawSlots}）`);

  console.log('— 按八法分组 —');
  for (const v of [...fa.values()].sort((a, b) => b.n - a.n)) {
    console.log(`  ${v.fa}: ${v.n} 方 / ${v.slots} 药位 / 平均 ${(v.slots / v.n).toFixed(1)} 味 → ${v.names.join('、')}`);
  }

  console.log('— 核心药（频次 ≥ 3）—');
  for (const h of coreHerbs(list, 3)) console.log(`  ${h.name} ${h.n} 方: ${h.where.join('、')}`);

  console.log('— Jaccard 最近邻前 5 对 —');
  for (const p of nearestPairs(list, 5)) {
    console.log(`  ${p.a} ~ ${p.b}: ${p.j.toFixed(2)}（共 ${p.shared} / 并 ${p.union}）${p.subset ? ' ← 子集' : ''}`);
  }

  console.log('— 真子集对（合方/相合而成）—');
  for (const p of subsetPairs(list)) {
    console.log(`  ${p.small}（${p.size} 味）⊂ ${p.big}（${p.bigSize} 味）`);
  }

  console.log('— 君臣佐使抽取覆盖 —');
  console.log(`  君 ${cov.cov['君']} / 臣 ${cov.cov['臣']} / 佐 ${cov.cov['佐']} / 使 ${cov.cov['使']} · 四角色齐 ${cov.full4.length} 方 · 全空 ${cov.none.length} 方（${cov.none.map((f) => f.name).join('、') || '无'}）`);

  console.log('— 逐节药位 —');
  for (const sec of bySection(list)) {
    console.log(`  ${sec.sec}: ${sec.n} 方 / ${sec.slots} 药位 / 平均 ${sec.avg.toFixed(1)} 味 → ${sec.names.join('、')}`);
  }

  console.log('— 两个反例 —');
  const dcq = list.find((f) => f.name === '大承气汤');
  const hl = list.find((f) => f.name === '黄龙汤');
  console.log(`  1) 药味数不度量峻猛：大承气汤 ${herbsOf(dcq).length} 味主峻下，黄龙汤 ${herbsOf(hl).length} 味主攻补兼施。`);
  const maxPair = nearestPairs(list, 1)[0];
  console.log(`  2) 最高相似对是 ${maxPair.a} ~ ${maxPair.b}（${maxPair.j.toFixed(2)}），二者分属${maxPair.a === '小柴胡汤' ? '少阳与肠胃两个和解层次' : '两节'}——相似度高不等于可互换。`);

  console.log('教学边界：本章只做教材方剂的结构统计与相似度对照，用于教学演示；不构成诊断/用药依据。');
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
  coreHerbs,
  jaccard,
  nearestPairs,
  subsetPairs,
  roleCoverage,
  bySection,
  main,
};
