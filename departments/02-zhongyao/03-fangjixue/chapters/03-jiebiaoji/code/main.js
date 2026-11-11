#!/usr/bin/env node
/**
 * 方剂学 · 第 3 章 解表剂：辛温与辛凉的分野
 * 课程: departments/02-zhongyao/03-fangjixue/chapters/03-jiebiaoji/docs/zh.md
 * 出处: 教材·第5章（5.1 辛温解表剂、5.2 辛凉解表剂、5.3 扶正解表剂）
 * 数据: standards/fangji/formulas.json（第5章 8 首方，含组成、功用、主治、君臣佐使）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么这一章要用药味共现来判「分野」：辛温与辛凉的分野如果只看节的标题，
 * 就是背目录；把 8 首方的药味铺开、看哪些药跨节出现，分野才变成可以检验的
 * 命题——麻黄同时出现在辛温的麻黄汤、小青龙汤与辛凉的麻杏石甘汤里，说明
 * 寒温不由单味药决定。这正是第 2 章「配伍环境」在解表剂里的落地。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// __dirname = .../departments/02-zhongyao/03-fangjixue/chapters/<slug>/code
// 不硬数 ../ 的层数（数错一次就 ENOENT），改为向上找到带 standards/fangji 的那一级
function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 10; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'fangji', 'formulas.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/fangji/formulas.json —— 章节目录是否已脱离仓库？');
}
const ROOT = findRoot(__dirname);
const FANGJI = path.join(ROOT, 'standards', 'fangji');

const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const load = () => readJSON(path.join(FANGJI, 'formulas.json'));

/** 本章的 8 首方：按教材章号取，不手写方名清单 */
function jiebiao(fj) {
  return fj.formulas
    .filter((f) => f.chapter === '5')
    .sort((a, b) => a.sub.localeCompare(b.sub));
}

function chapterHanzi(no) {
  const base = readJSON(path.join(FANGJI, '底本.json'));
  const c = base.chapters.find((x) => x.no === String(no));
  if (!c) throw new Error(`底本里没有第 ${no} 章`);
  return c.counts.hanzi;
}

/** 按节分组，保持教材节序（5.1 → 5.3） */
function bySection(list) {
  const g = new Map();
  for (const f of list) {
    if (!g.has(f.sec)) g.set(f.sec, []);
    g.get(f.sec).push(f);
  }
  return g;
}

/** 药名 → 出现过的节号集合（只看节号前三位，避免节名措辞变化影响判定） */
function herbSections(list) {
  const m = new Map();
  for (const f of list) {
    const sec = f.sec.slice(0, 3);
    for (const h of f.composition.herbs || []) {
      if (!m.has(h.name)) m.set(h.name, new Set());
      m.get(h.name).add(sec);
    }
  }
  return m;
}

/** 跨节药：出现在两个以上节里的药。它们不能用来判寒温 */
function crossSectionHerbs(list) {
  const m = herbSections(list);
  return [...m.entries()]
    .filter(([, secs]) => secs.size > 1)
    .map(([herb, secs]) => ({ herb, secs: [...secs].sort() }));
}

/** 全方共有的药：出现在每一首方里的药，是解表剂的常数，不是分野 */
function universalHerbs(list) {
  const names = new Set();
  for (const f of list) for (const h of f.composition.herbs || []) names.add(h.name);
  return [...names]
    .filter((herb) => list.every((f) => (f.composition.herbs || []).some((h) => h.name === herb)))
    .sort();
}

/** 药位与药名数：药位是「方 × 药」的出现次数，药名数是去重结果 */
function herbStats(list) {
  const slots = list.reduce((n, f) => n + (f.composition.herbs || []).length, 0);
  const names = new Set();
  for (const f of list) for (const h of f.composition.herbs || []) names.add(h.name);
  return { slots, names: names.size };
}

function main() {
  const fj = load();
  const list = jiebiao(fj);
  const secs = bySection(list);
  const { slots, names } = herbStats(list);

  console.log('═══ 解表剂：辛温与辛凉的分野 (方剂学 第3章) ═══');
  console.log(`教材规模: 第5章 ${chapterHanzi(5)} 字 | 本章方剂 ${list.length} 首 | 药位 ${slots} 个 | 药名 ${names} 个`);

  console.log('\n八首方 —— 节 / 药味 / 君药 / 功用');
  for (const f of list) {
    console.log(`  ${f.sub} ${f.name.padEnd(5, '　')} ${String(f.composition.herbs.length).padStart(2)} 味 · 君:${(f.roles['君'] || []).join('、') || '（空）'} · ${f.gongyong.replace(/。$/, '')}`);
  }

  console.log('\n三节的分野（同一「汗」法之下的三层）');
  for (const [sec, arr] of secs) {
    const avg = (arr.reduce((n, f) => n + f.composition.herbs.length, 0) / arr.length).toFixed(1);
    console.log(`  ${sec} · ${arr.length} 首 · 平均 ${avg} 味 · ${arr.map((f) => f.name).join('、')}`);
  }

  console.log('\n跨节药 —— 这些药不能用来判寒温');
  for (const { herb, secs: s } of crossSectionHerbs(list)) {
    const where = list.filter((f) => (f.composition.herbs || []).some((h) => h.name === herb));
    console.log(`  ${herb.padEnd(3, '　')} 出现于 ${s.join(' / ')} · ${where.map((f) => `${f.name}`).join('、')}`);
  }

  const uni = universalHerbs(list);
  console.log(`\n全方共有: ${uni.join('、') || '（无）'} —— 出现在 ${list.length}/${list.length} 首里，是解表剂的常数而非分野`);

  console.log('\n判据检验: 单味药能否定寒温？');
  const ma = list.filter((f) => (f.composition.herbs || []).some((h) => h.name === '麻黄'));
  console.log(`  含麻黄 ${ma.length} 首: ${ma.map((f) => `${f.name}(${f.sub})`).join('、')}`);
  console.log('  → 同一味麻黄同时支撑辛温与辛凉两节，故寒温由配伍环境决定，不由单味药性决定');

  console.log('\n分类看节、不看措辞:');
  const xinliangWord = secs.get('5.2 辛凉解表剂').filter((f) => /辛凉/.test(f.gongyong));
  console.log(`  5.2 三首中，功用措辞含「辛凉」的只有 ${xinliangWord.length} 首: ${xinliangWord.map((f) => f.name).join('、')}`);
  console.log('  → 桑菊饮功用作「疏风清热，宣肺止咳」，仍归辛凉节：节是分类，措辞是表述');

  console.log('\n教学边界：本章数字由 standards/fangji 现算，方名与功用取自教材第5章；选方须辨证，不构成诊断/用药依据');

  return { list, secs, slots, names, cross: crossSectionHerbs(list), uni };
}

if (require.main === module) {
  main();
}

module.exports = {
  findRoot,
  load,
  jiebiao,
  chapterHanzi,
  bySection,
  herbSections,
  crossSectionHerbs,
  universalHerbs,
  herbStats,
  main,
};
