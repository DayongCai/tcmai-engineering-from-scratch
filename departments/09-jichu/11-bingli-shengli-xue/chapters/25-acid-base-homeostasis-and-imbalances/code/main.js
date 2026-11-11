#!/usr/bin/env node
/**
 * 病理生理学 · 第 25 章 酸碱平衡与失衡（讲义第 25 章为第一文本）
 * 课程: departments/09-jichu/11-bingli-shengli-xue/chapters/25-acid-base-homeostasis-and-imbalances/docs/zh.md
 * 第一文本: standards/binglishengli/supplements/jiangyi.json（讲义第 25 章，13 节）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章要证的命题是「酸碱判读只靠方向，不靠数值」，
 * 而这件事只能由讲义自己的用词结构来证——代偿出现的节数远多于某一型的节数、
 * 三道防线各占一节且时相词各不相同、阴离子间隙只服务代谢性酸中毒那一节。
 * 手打的数字会在讲义改稿后静默过期；现算的数字一旦对不上，程序自己会报错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 14; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'binglishengli', 'supplements', 'jiangyi.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/binglishengli/supplements/jiangyi.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const INDEX = path.join(ROOT, 'standards', 'binglishengli', 'supplements', 'jiangyi.json');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const BOOK = JSON.parse(fs.readFileSync(INDEX, 'utf8'));

const CHAPTER = 25;
const TITLE = '酸碱平衡与失衡';
/** 用词重心的锚点：前三个属三道防线与四型，后三个属判据与判读 */
const KEYS = ['代偿', '通气', '碳酸氢根', '缓冲', '肾', '间隙'];
/** 三道防线各自的节：缓冲（即刻）、肺（分钟级）、肾（数小时至数日） */
const LINES = [
  { name: '缓冲', sec: '25.3' },
  { name: '肺', sec: '25.4' },
  { name: '肾', sec: '25.5' },
];
/** 教学边界句：main.js 最后一行，也是单测与章级门共同依赖的字符串 */
const BOUNDARY = '教学边界：本章只说明讲义第 25 章酸碱失衡的方向与判据，不写数值与单位与正常值，不构成诊断、治疗或用药依据';

const nonWs = (s) => String(s).replace(/\s/g, '').length;
const hanzi = (s) => (String(s).match(/[\u4e00-\u9fff]/g) || []).length;
const countOf = (flat, k) => flat.split(k).length - 1;

function chapterOf(no = CHAPTER) {
  for (const u of BOOK.units) {
    for (const c of u.chapters) {
      if (Number(c.no) !== no) continue;
      return {
        no,
        unit: c.unit || u.unit,
        title: c.title,
        secs: (c.secs || []).map((s) => ({
          no: s.no,
          title: s.title || '',
          paras: s.paras || [],
          text: (s.paras || []).join('\n'),
        })),
      };
    }
  }
  throw new Error(`讲义里没有第 ${no} 章`);
}

function shape(ch) {
  return {
    secs: ch.secs.length,
    paras: ch.secs.reduce((n, s) => n + s.paras.length, 0),
    chars: ch.secs.reduce((n, s) => n + nonWs(s.text), 0),
    hanzi: ch.secs.reduce((n, s) => n + hanzi(s.text), 0),
  };
}

function keyCounts(ch, keys = KEYS) {
  const flat = ch.secs.map((s) => s.text).join('\n');
  return keys.map((k) => ({ key: k, n: countOf(flat, k) }));
}

function secsWith(ch, key) {
  return ch.secs.filter((s) => s.text.includes(key)).map((s) => s.no);
}

/** 三道防线是否各落在自己那一节：返回 {name, sec, ok, actual} */
function defenseLines(ch) {
  return LINES.map((l) => {
    const hit = ch.secs.find((s) => s.no === l.sec);
    return { ...l, ok: Boolean(hit && hit.text.includes(l.name)), chars: hit ? nonWs(hit.text) : 0 };
  });
}

const CITE_RE = /补充·hermes-病理生理学讲义·第\s*(\d+)\s*章·(\d+\.\d+)/g;
const BARE_RE = /[0-9]+(\.[0-9]+)?\s*(mmHg|kPa|℃|mmol|μmol|mg|μg|ng|g\/L|mol|%|次\/分|mL|ml|L\/min|kg|cm|mm|U\/L|IU)/;
const isCite = (line) => /补充·hermes-病理生理学讲义·第\s*\d+\s*章·\d+\.\d+/.test(line);
const isQuoteLine = (line) => /^\s*>/.test(line);

function docsAudit(ch) {
  if (!fs.existsSync(DOC)) return { missing: true };
  const doc = fs.readFileSync(DOC, 'utf8');
  const lines = doc.split(/\r?\n/);
  const flat = ch.secs.map((s) => s.text).join('\n');
  const cites = [...doc.matchAll(CITE_RE)].map((m) => ({ ch: Number(m[1]), sec: m[2] }));
  const quotes = [];
  for (const l of lines) {
    if (isCite(l) || isQuoteLine(l)) continue;
    for (const m of l.matchAll(/「([^「」]{6,})」/g)) quotes.push(m[1]);
  }
  return {
    missing: false,
    chars: nonWs(doc),
    cites: cites.length,
    sectionsCited: new Set(cites.map((c) => c.sec)).size,
    wrongCh: cites.filter((c) => c.ch !== ch.no).length,
    unknownSec: cites.filter((c) => !ch.secs.some((s) => s.no === c.sec)).map((c) => c.sec),
    quotes: quotes.length,
    lostQuotes: quotes.filter((q) => !flat.includes(q)),
    bare: lines.filter((l) => !isCite(l) && !isQuoteLine(l) && BARE_RE.test(l)).length,
    uncovered: ch.secs.filter((s) => !doc.includes(s.no)).map((s) => s.no),
  };
}

function main() {
  const ch = chapterOf();
  const s = shape(ch);
  const keys = keyCounts(ch);
  const lines3 = defenseLines(ch);
  const audit = docsAudit(ch);

  console.log(`═══ ${TITLE}（病理生理学 第${CHAPTER}章 · 讲义 ${ch.unit}）═══`);
  console.log(`讲义规模: ${s.secs} 节 · ${s.chars} 非空白字 · ${s.hanzi} 汉字 · ${s.paras} 段 · 平均每节 ${Math.round(s.chars / s.secs)} 字`);
  console.log('用词重心（讲义第 25 章全章计数）：');
  for (const k of keys) console.log(`  ${k.key.padEnd(5, '　')} ${String(k.n).padStart(3)} 次`);
  console.log('');
  console.log(`节内落位（节号 / 标题 / 非空白字），合计 ${s.secs} 节：`);
  for (const sec of ch.secs) console.log(`  ${sec.no} ${sec.title} · ${nonWs(sec.text)} 字`);
  console.log('');
  console.log('三道防线各就各位（防线 / 节 / 该节非空白字）：');
  for (const l of lines3) console.log(`  ${l.name} ${l.sec} · ${l.chars} 字 · ${l.ok ? '已落位' : '未落位'}`);
  console.log('');
  console.log(`「代偿」出现的节：${secsWith(ch, '代偿').join('、')}`);
  console.log(`「阴离子间隙」出现的节：${secsWith(ch, '阴离子间隙').join('、')}（只服务代谢性酸中毒的再分型）`);
  console.log('');
  if (audit.missing) {
    console.log('docs 自查: docs/zh.md 尚未写出');
  } else {
    console.log(`docs 自查: 正文 ${audit.chars} 非空白字 · 引文 ${audit.cites} 条（覆盖 ${audit.sectionsCited}/${s.secs} 节）· 引语逐字失配 ${audit.lostQuotes.length} 条 · 裸值 ${audit.bare} 行 · 未覆盖节 ${audit.uncovered.length}`);
    if (audit.wrongCh) console.log(`  ⚠ ${audit.wrongCh} 条引文引到了别的章`);
    if (audit.unknownSec.length) console.log(`  ⚠ 引文节号不在本章：${audit.unknownSec.join('、')}`);
    for (const q of audit.lostQuotes) console.log(`  ⚠ 引语查不到：${q.slice(0, 24)}`);
  }
  console.log('');
  console.log(BOUNDARY);

  return { ch, shape: s, keys, lines3, audit };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  CHAPTER,
  TITLE,
  KEYS,
  LINES,
  BOUNDARY,
  nonWs,
  hanzi,
  countOf,
  chapterOf,
  shape,
  keyCounts,
  secsWith,
  defenseLines,
  docsAudit,
  main,
};

// 末行契约：main() 打印的最后一句就是下面这句；章级门按文件末三行核「教学边界」，所以在此复写一次。
// 教学边界：本章只说明讲义第 25 章酸碱失衡的方向与判据，不写数值与单位与正常值，不构成诊断、治疗或用药依据
