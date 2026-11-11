#!/usr/bin/env node
/**
 * 方剂学 · 第 1 章 方剂与治法：方从法出
 * 课程: departments/02-zhongyao/03-fangjixue/chapters/01-fangfa-ducong/docs/zh.md
 * 出处: 教材·第2章·2.1（方从法出、法随证立）与 2.2（医门八法）；第1章绪论
 * 数据: standards/fangji/formulas.json（114 首方，每方带八法归属）
 *       standards/fangji/底本.json（逐章汉字数）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算而不手打：本章要讲的命题是「以法统方」，即每一首方都应能
 * 追溯到一个治法。这个命题的真假取决于「按法分组之后每一组是否真的非空、
 * 合计是否真的等于 114」。手打的数字只要教材改版就静默过期，而且没人会
 * 发现；现算的数字一旦对不上，程序自己会报错。教学里最贵的东西是「能对账」。
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

function load() {
  return {
    formulas: readJSON(path.join(FANGJI, 'formulas.json')),
    base: readJSON(path.join(FANGJI, '底本.json')),
  };
}

/** 八法一栏：法 → 教材章 → 方数 → 代表方。数据取自 formulas.json 的 bafa.items */
function bafaTable(fj) {
  return fj.bafa.items.map((it) => ({
    fa: it.fa,
    chapters: it.chapters.slice(),
    n: it.formulas,
    names: it.names.slice(),
  }));
}

/** 不属八法的方，按教材章归堆：一章一法判不出归属，就单独成组 */
function outsideByChapter(fj) {
  const out = new Map();
  for (const f of fj.formulas) {
    if (f.fa) continue;
    const k = f.chapter;
    if (!out.has(k)) out.set(k, []);
    out.get(k).push(f.name);
  }
  return out;
}

/** 一法之内的层次：同一章按「节」再分。辛温/辛凉/扶正的分野就在这里显形 */
function groupBySection(fj, chapterNo) {
  const groups = new Map();
  for (const f of fj.formulas) {
    if (f.chapter !== String(chapterNo)) continue;
    const sec = f.sec;
    if (!groups.has(sec)) groups.set(sec, []);
    groups.get(sec).push(f.name);
  }
  return groups;
}

/** 教材章汉字数，直接读底本 counts，不做估算 */
function chapterHanzi(base, nos) {
  const byNo = new Map(base.chapters.map((c) => [c.no, c]));
  return nos.reduce((n, no) => n + byNo.get(no).counts.hanzi, 0);
}

/** 一首方属于哪一法：八法之内取 fa，之外返回 null（不猜、不就近归并） */
function faOf(fj, name) {
  const f = fj.formulas.find((x) => x.name === name);
  if (!f) throw new Error(`formulas.json 里没有 ${name}`);
  return f.fa || null;
}

function main() {
  const { formulas: fj, base } = load();

  const total = fj.formulas.length;
  const inBafa = fj.formulas.filter((f) => f.fa).length;
  const table = bafaTable(fj);
  const sumBafa = table.reduce((n, r) => n + r.n, 0);
  const outside = outsideByChapter(fj);
  const outCount = [...outside.values()].reduce((n, a) => n + a.length, 0);

  const hanzi = chapterHanzi(base, ['2', '1']); // 第2章 + 第1章

  console.log('═══ 方剂与治法：方从法出 (方剂学 第1章) ═══');
  console.log(`教材规模: 第2章 ${chapterHanzi(base, ['2'])} 字 + 第1章 ${chapterHanzi(base, ['1'])} 字 = ${hanzi} 字`);
  console.log(`方剂层: 共 ${total} 首 | 属八法 ${inBafa} 首 (${((inBafa / total) * 100).toFixed(1)}%) | 不属八法 ${outCount} 首 (${((outCount / total) * 100).toFixed(1)}%)`);
  console.log(`对账: 八法各栏合计 ${sumBafa} + 法外 ${outCount} = ${sumBafa + outCount} ${sumBafa + outCount === total ? '✅' : '❌'}`);

  console.log('\n八法 —— 法 / 教材章 / 方数 / 代表方');
  for (const r of table) {
    const rep = r.names.slice(0, 3).join('、');
    console.log(`  ${r.fa} · 第${r.chapters.join('/')}章 · ${String(r.n).padStart(2)} 首 · ${rep}${r.n > 3 ? '…' : ''}`);
  }

  console.log('\n法外 62 首按章分布（不是「无法」，是本章按章判法的边界）');
  for (const [no, names] of [...outside.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))) {
    const title = (base.chapters.find((c) => c.no === no) || {}).title || `第${no}章`;
    console.log(`  第${String(no).padStart(2)}章 ${String(names.length).padStart(2)} 首 · ${title.replace(/^第\d+章\s*/, '')}`);
  }

  console.log('\n一法多方：汗法 8 首的内部结构（同一法，寒温异路）');
  const han = groupBySection(fj, 5);
  for (const [sec, names] of han) {
    console.log(`  ${sec} · ${names.length} 首 · ${names.join('、')}`);
  }

  console.log('\n法随证立的最小检验：给一首方，能不能说出它属于哪一法');
  for (const name of ['麻黄汤', '银翘散', '大承气汤', '六味地黄丸', '香薷散']) {
    const fa = faOf(fj, name);
    console.log(`  ${name} → ${fa ? `${fa}法` : '八法之外（不就近归并）'}`);
  }

  console.log('\n教学边界：本章数字由 standards/fangji 现算，只用于说明教材的分类逻辑；方剂的选用与剂量须经医师辨证，不构成诊断/用药依据');

  return { total, inBafa, outCount, table, outside, hanzi, han };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  FANGJI,
  load,
  bafaTable,
  outsideByChapter,
  groupBySection,
  chapterHanzi,
  faOf,
  main,
};
