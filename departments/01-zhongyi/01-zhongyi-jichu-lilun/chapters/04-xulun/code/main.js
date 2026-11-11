#!/usr/bin/env node
/**
 * 中医基础理论 · 第 4 章 绪论：中医学的学科属性与工程化边界
 * 课程: departments/01-zhongyi/01-zhongyi-jichu-lilun/chapters/04-xulun/docs/zh.md
 * 出处: 教材·第1章 绪论与AI时代学习体系（standards/jichu/底本.json）
 * 依赖: 仅 Node.js 标准库
 *
 * 这章不建模型，只做一件事：把「这门学科能算到什么程度」量出来。
 * 三个量：教材本体规模、AI/平台映射段的占比、映射的层级（注释层 vs 原文层）。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const BOOK = path.join(ROOT, 'standards', 'jichu', '底本.json');

function load() {
  return JSON.parse(fs.readFileSync(BOOK, 'utf8'));
}

const doc = load();

// 这里不能写死 13/70/327 之类；全部从底本现算，教材一改数字就跟着变
function bookShape() {
  const chs = doc.chapters;
  return {
    chapters: chs.length,
    secs: chs.reduce((n, c) => n + c.counts.secs, 0),
    subs: chs.reduce((n, c) => n + c.counts.subs, 0),
    paras: chs.reduce((n, c) => n + c.counts.paras, 0),
    chars: chs.reduce((n, c) => n + c.counts.chars, 0),
    perChapter: chs.map((c) => ({
      no: c.no,
      title: c.title,
      secs: c.counts.secs,
      paras: c.counts.paras,
      chars: c.counts.chars,
    })),
  };
}

// 把所有正文段拉平（节级 + 小节级 + 章级），供词频统计
function allParas() {
  const out = [];
  for (const c of doc.chapters) {
    for (const p of c.paras || []) out.push({ ch: c.no, text: p });
    for (const s of c.secs) {
      for (const p of s.paras) out.push({ ch: c.no, text: p });
      for (const sub of s.subs) for (const p of sub.paras) out.push({ ch: c.no, text: p });
    }
  }
  return out;
}

// 教材每一段都带一句「平台/AI 怎么做」。把这层单独数出来：
// 它就是「工程化边界」的物证——映射存在，但它是**附在原文之后的注释段**。
const MARKERS = ['AI', '平台', '系统', '仿真', '模型'];

function mappingShare(markers = MARKERS) {
  const ps = allParas();
  const hit = ps.filter((p) => markers.some((m) => p.text.includes(m)));
  const byCh = {};
  for (const p of ps) {
    byCh[p.ch] = byCh[p.ch] || { paras: 0, hit: 0 };
    byCh[p.ch].paras += 1;
    if (markers.some((m) => p.text.includes(m))) byCh[p.ch].hit += 1;
  }
  return {
    paras: ps.length,
    hit: hit.length,
    share: hit.length / ps.length,
    byChapter: Object.entries(byCh).map(([no, v]) => ({
      no,
      paras: v.paras,
      hit: v.hit,
      share: v.hit / v.paras,
    })),
  };
}

// 一份段落里，「AI 映射」是否与理论同段：同段 = 混写，异段 = 分层。
// 本教材全部混写在同一段内（一句理论 + 一句平台），所以不能靠切段分离——
// 这条事实决定了后面各章的代码只能引理论句，不能引映射句当事实。
function mixing() {
  const ps = allParas();
  const both = ps.filter((p) => /AI|平台/.test(p.text) && /者|谓|即|是指/.test(p.text));
  return { total: ps.length, mixed: both.length, share: both.length / ps.length };
}

function main() {
  const shape = bookShape();
  const map = mappingShare();
  const mix = mixing();

  console.log('═══ 中医基础理论 · 教材本体 ═══');
  console.log(`  版本 ${doc.edition}`);
  console.log(`  sha256 ${doc.source.sha256.slice(0, 16)} · ${shape.chapters} 章 · ${shape.secs} 节 · ${shape.subs} 小节 · ${shape.paras} 段 · ${shape.chars.toLocaleString()} 字`);
  console.log('');
  console.log('  各章规模（段数 / 字数）：');
  for (const c of shape.perChapter) {
    console.log(`    第${c.no}章 ${c.title}: ${c.secs} 节 · ${c.paras} 段 · ${c.chars.toLocaleString()} 字`);
  }
  console.log('');
  console.log('═══ 工程化映射层 ═══');
  console.log(`  带「AI/平台/系统/仿真/模型」的段：${map.hit}/${map.paras}（${(map.share * 100).toFixed(1)}%）`);
  const hi = map.byChapter.slice().sort((a, b) => b.share - a.share).slice(0, 3);
  const lo = map.byChapter.slice().sort((a, b) => a.share - b.share).slice(0, 3);
  console.log(`  映射最密：${hi.map((x) => `第${x.no}章 ${(x.share * 100).toFixed(0)}%`).join(' · ')}`);
  console.log(`  映射最稀：${lo.map((x) => `第${x.no}章 ${(x.share * 100).toFixed(0)}%`).join(' · ')}`);
  console.log('');
  console.log(`  理论句与映射句同段的比例：${mix.mixed}/${mix.total}（${(mix.share * 100).toFixed(1)}%）`);
  console.log('  → 同段混写，说明映射不是独立章节，而是理论句之后的注释；引用时必须分开。');
  console.log('');
  console.log('教学边界：本章只度量教材自身的可计算程度，不对任何人的体质、证候或用药作判断；不构成诊疗依据。');
}

if (require.main === module) main();

module.exports = { bookShape, allParas, mappingShare, mixing, MARKERS, doc };
