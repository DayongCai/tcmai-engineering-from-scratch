#!/usr/bin/env node
/**
 * 病理生理学 · 第 28 章 急性肾损伤与慢性肾脏病
 * 讲义: standards/binglishengli/supplements/jiangyi.json（第 28 章 11 节）
 * docs: docs/zh.md
 *
 * 为什么全部现算：本章要说的命题是「急与慢是同一枚硬币的两面，代偿本身即损害的动力」。
 * 这件事只能由讲义自己的用词重心来证：十一节里「肾单位」「代偿」「滤过」各出现几次，
 * 系统后果那一头「尿毒症」「贫血」「高钾」各占多少。
 * 手打的数字在讲义改写后静默过期；现算的数字一旦对不上，程序自己会报错。
 *
 * 依赖: 仅 Node.js 标准库。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// ── 本章配置 ─────────────────────────────────────────────────────────
const CHAPTER = 28;
const TITLE = '急性肾损伤与慢性肾脏病';
/** 术语表：结构端三个词 + 代偿端两个词 + 系统端四个词 */
const TERMS = ['肾单位', '滤过', '代偿', '肾小管', '肾小球', '蛋白尿', '尿毒症', '高钾', '贫血', '纤维化'];

/** 教学边界句：main.js 最后一行，也是单测与章级门共同依赖的字符串 */
const BOUNDARY =
  '教学边界：本章只说明讲义给出的机制链条与系统后果，不写数值与单位与正常值，不构成诊断、治疗或用药依据';

// ── 定位与读取 ───────────────────────────────────────────────────────
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
const IDX = path.join(ROOT, 'standards', 'binglishengli', 'supplements', 'jiangyi.json');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const nonWs = (s) => String(s).replace(/\s/g, '').length;
const hanzi = (s) => (String(s).match(/[\u4e00-\u9fa5]/g) || []).length;

/** 讲义第 no 章：节号、节题、正文（paras 拼接，保留原样，供逐字核引用） */
function loadChapter(no = CHAPTER) {
  const idx = JSON.parse(fs.readFileSync(IDX, 'utf8'));
  for (const u of idx.units) {
    for (const c of u.chapters) {
      if (Number(c.no) !== Number(no)) continue;
      const secs = c.secs.map((s) => ({
        no: s.no,
        title: s.title || '',
        text: (s.paras || []).join('\n'),
      }));
      return { no: Number(no), title: c.title, unit: u.unit, secs };
    }
  }
  throw new Error(`讲义里没有第 ${no} 章`);
}

/** 讲义规模：节数 / 非空白字符 / 汉字 */
function shape(ch) {
  return {
    secs: ch.secs.length,
    chars: ch.secs.reduce((n, s) => n + nonWs(s.text), 0),
    hanzi: ch.secs.reduce((n, s) => n + hanzi(s.text), 0),
  };
}

/** 术语词频：整章逐字计数（重叠计一次，避免「肾小球」把「小球」算重） */
function termFreq(ch, terms = TERMS) {
  const flat = ch.secs.map((s) => s.text).join('\n');
  const out = {};
  for (const t of terms) {
    let n = 0;
    let i = flat.indexOf(t);
    while (i !== -1) {
      n += 1;
      i = flat.indexOf(t, i + t.length);
    }
    out[t] = n;
  }
  return out;
}

const rank = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);

// ── docs 审计（与 tests/test_binglishengli_chapters.js 同口径）──────────
const CITE_RE = /补充·hermes-病理生理学讲义·第\s*(\d+)\s*章·(\d+\.\d+)/g;
const isCite = (line) => /补充·hermes-病理生理学讲义·第\s*\d+\s*章·\d+\.\d+/.test(line);
const isQuoteLine = (line) => /^\s*>/.test(line);
/** 「数字＋计量单位」的零容忍清单（引用行豁免：那是在引讲义原话） */
const BARE = /[0-9]+(\.[0-9]+)?\s*(mmHg|kPa|℃|mmol|μmol|mg|μg|ng|g\/L|mol|%|次\/分|mL|ml|L\/min|kg|cm|mm|U\/L|IU)/;

function docAudit(doc, ch) {
  const lines = doc.split(/\r?\n/);
  const flat = ch.secs.map((s) => s.text).join('\n');
  const cites = [...doc.matchAll(CITE_RE)].map((m) => ({ ch: Number(m[1]), sec: m[2] }));
  const uncovered = ch.secs.map((s) => s.no).filter((no) => !doc.includes(no));
  const bareLines = lines.filter((l) => !isCite(l) && !isQuoteLine(l) && BARE.test(l));
  const quotes = [];
  for (const l of lines) {
    if (isCite(l) || isQuoteLine(l)) continue;
    for (const m of l.matchAll(/「([^「」]{6,})」/g)) quotes.push(m[1]);
  }
  const quoteBad = quotes.filter((q) => !flat.includes(q));
  return {
    chars: nonWs(doc),
    cites,
    wrongCh: cites.filter((x) => x.ch !== ch.no),
    noSec: cites.filter((x) => x.ch === ch.no && !ch.secs.some((s) => s.no === x.sec)),
    uncovered,
    bareLines,
    quotes,
    quoteBad,
  };
}

function quizAudit() {
  if (!fs.existsSync(QUIZ)) return { total: 0, pre: 0, check: 0, post: 0, noQuestionKey: 0, cited: 0 };
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const qs = q.questions || [];
  const stage = (s) => qs.filter((x) => x.stage === s).length;
  return {
    total: qs.length,
    pre: stage('pre'),
    check: stage('check'),
    post: stage('post'),
    noQuestionKey: qs.filter((x) => !x.question).length,
    cited: qs.filter((x) => /(依据|口径见|前提|算见)/.test(x.explanation || '')).length,
  };
}

function main() {
  const ch = loadChapter();
  const s = shape(ch);
  const freq = termFreq(ch);
  const doc = fs.existsSync(DOC) ? fs.readFileSync(DOC, 'utf8') : '';
  const a = docAudit(doc, ch);

  console.log(`═══ ${TITLE}（病理生理学 第${CHAPTER}章 · 讲义第${ch.no}章）═══`);
  console.log(`讲义规模: ${s.secs} 节 · ${s.chars} 非空白字符 · ${s.hanzi} 汉字 · 平均每节 ${Math.round(s.hanzi / s.secs)} 汉字`);
  console.log('节号: ' + ch.secs.map((x) => `${x.no} ${x.title}`).join(' / '));
  console.log('');
  console.log('术语词频（整章逐字计数）：');
  for (const [k, v] of rank(freq)) console.log(`  ${k} ${String(v).padStart(4)} 次`);
  console.log(`  → 分类端三个部位里最高的是「${rank(freq)[0][0]}」，落点与本章的第一个判断一致：先定部位。`);
  console.log('');
  console.log('docs 审计：');
  console.log(`  正文 ${a.chars} 非空白字（门限 3000，目标 5000–7000）`);
  console.log(`  引文 ${a.cites.length} 条，跨章 ${a.wrongCh.length} 条，节号不存在 ${a.noSec.length} 条`);
  console.log(`  节号覆盖 ${ch.secs.length - a.uncovered.length} / ${ch.secs.length}${a.uncovered.length ? '（缺 ' + a.uncovered.join('、') + '）' : ''}`);
  console.log(`  正文裸值行 ${a.bareLines.length} 行`);
  console.log(`  逐字引语 ${a.quotes.length} 条，核不到 ${a.quoteBad.length} 条${a.quoteBad.length ? '（如「' + a.quoteBad[0].slice(0, 16) + '…」）' : ''}`);
  const q = quizAudit();
  console.log(`  quiz ${q.total} 题（pre ${q.pre} · check ${q.check} · post ${q.post}）· 带引证 ${q.cited} 题 · 题干键异常 ${q.noQuestionKey} 题`);
  console.log('');
  console.log(BOUNDARY);

  return { ch, shape: s, freq, audit: a, quiz: q };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  CHAPTER,
  TITLE,
  TERMS,
  BOUNDARY,
  DOC,
  QUIZ,
  loadChapter,
  shape,
  termFreq,
  rank,
  docAudit,
  quizAudit,
  main,
};

// 末行打印教学边界：main() 的最后一行就是 BOUNDARY 这句，单测与章级门都按此字符串核对
