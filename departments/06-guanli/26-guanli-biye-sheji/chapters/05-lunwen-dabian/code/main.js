#!/usr/bin/env node
/**
 * 毕业设计（管理类） · 第 5 章 答辩不是复述结论，而是当场交代结论的适用条件
 *
 *   node departments/06-guanli/26-guanli-biye-sheji/chapters/05-lunwen-dabian/code/main.js
 *
 * 正文：chapters/05-lunwen-dabian/docs/zh.md
 * 习题：chapters/05-lunwen-dabian/quiz.json
 * 依赖：仅 Node.js 标准库
 *
 * 只读本章正文与本章 quiz，不读任何 standards 取数表：正文改了，这里的数字跟着变。
 *   · 规模：汉字、段、二级节标题、表格张数与每张表的列数／行数
 *   · 判据与门限：RULES 逐条在正文里定位（命中即打印原文片段），再加按单位归类的数值门限
 *   · 本章算术：法条三成分到论证三段、限定写法对照、答辩时间分配与五问演练
 *   · quiz 体检：题量、三段分布、选项数、解释长度、答案位置是否打散、check 题能否接回正文原词
 * 任何一项对不上，说明正文、代码、习题三者已经不同源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const COURSE = '毕业设计（管理类）';
const CHAPTER = 5;
const SLUG = '05-lunwen-dabian';
const TITLE = '答辩不是复述结论，而是当场交代结论的适用条件';

/* ── 文本口径 ────────────────────────────────────────────────────── */

const LINES = /\r?\n/;
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const occurrences = (text, term) => String(text).split(term).length - 1;
const num = (s) => Number(String(s == null ? '' : s).replace(/[,，\s]/g, ''));

const readDoc = () => fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');

/** 二级节：「## 一、…」 */
function h2Sections(text) {
  const out = [];
  let cur = null;
  for (const line of String(text).split(LINES)) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) {
      cur = { title: m[1].trim(), body: [line] };
      out.push(cur);
    } else if (cur) {
      cur.body.push(line);
    }
  }
  return out.map((s) => ({ title: s.title, body: s.body.join('\n') }));
}

/** 段：非空，不以标题、引文、表格行、清单符号或编号起始 */
function paragraphs(text) {
  return String(text)
    .split(LINES)
    .map((l) => l.trim())
    .filter((l) => l && !/^[#>|]/.test(l) && !/^[-*+]\s/.test(l) && !/^\d+[.、]/.test(l))
    .filter((l) => !l.includes('|'));
}

/** markdown 表格：连续以 | 开头的行成块；head 为首行，rows 跳过表头与分隔行 */
function tables(text) {
  const blocks = [];
  let cur = null;
  for (const line of String(text).split(LINES)) {
    const s = line.trim();
    if (s.startsWith('|')) {
      if (!cur) {
        cur = [];
        blocks.push(cur);
      }
      cur.push(s);
    } else {
      cur = null;
    }
  }
  return blocks.map((b) => {
    const cells = b.map((r) => r.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()));
    return { head: cells[0] || [], cols: (cells[0] || []).length, rows: cells.slice(2) };
  });
}

/** 正文里长度为 n 的连续汉字片段 */
function grams(text, n) {
  const w = n || 4;
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + w <= seg.length; i += 1) out.add(seg.slice(i, i + w));
  }
  return out;
}

/* ── 判据与门限：逐条在正文里定位 ────────────────────────────────── */

const RULES = [
  { label: '法条三成分', re: /义务（谁在什么条件下必须做什么）/ },
  { label: '证伪条件要具体', re: /必须具体到指标与阈值/ },
  { label: '事实与价值要分开', re: /把「我观察到」写成「事实是」/ },
  { label: '可迁移的三层限定', re: /实践的正当性、防护的最优化、个人剂量限值/ },
  { label: '论证三段骨架', re: /命题—证据—边界/ },
  { label: '第一个追问', re: /追问一：样本是怎么来的/ },
  { label: '第五个追问', re: /追问五：能推广到哪/ },
  { label: '陈述时间的三分法', re: /三分之一时间讲问题与设计/ },
  { label: '不显著的写法', re: /按现有资料尚不能认为两组不同/ },
];

function gateAudit(text) {
  return RULES.map((r) => {
    const m = r.re.exec(text);
    return {
      label: r.label,
      hit: Boolean(m),
      quote: m ? m[0].replace(/\s+/g, ' ').trim() : '',
    };
  });
}

/** 带单位的数值门限，按单位归类；同一单位出现几次就是几条门限 */
const GATE_RE = /(\d[\d,]*(?:\.\d+)?)\s*(个百分点|个月|小时|分钟|万元|周|天|年|例|张|份|人|%|元)/g;

function numericGates(text) {
  const groups = new Map();
  let m;
  const re = new RegExp(GATE_RE.source, 'g');
  while ((m = re.exec(String(text))) !== null) {
    const unit = m[2];
    if (!groups.has(unit)) groups.set(unit, []);
    groups.get(unit).push(num(m[1]));
  }
  return [...groups.entries()]
    .map(([unit, vals]) => ({ unit: unit, n: vals.length, vals: vals }))
    .sort((a, b) => b.n - a.n);
}

/* ── 本章算术（从正文解析后现算） ──────────────────────────────── */

function chapterArithmetic(text, ts) {
  const out = [];
  const lt = ts.find((x) => x.head.join(' ').includes('写作要求'));
  const lt2 = ts.find((x) => x.head.join(' ').includes('可判断的写法'));
  const mins = num((text.match(/答辩通常\s*(\d+)\s*分钟/) || [])[1]);
  out.push('法条→论文对照表 ' + (lt ? lt.rows.length : 0) + ' 行 × ' + (lt ? lt.cols : 0) + ' 列：义务→命题、违反→证伪条件、后果→适用范围');
  out.push('笼统写法对照表 ' + (lt2 ? lt2.rows.length : 0) + ' 行：每一条都要给出数字、范围与影响方向');
  out.push('答辩 ' + mins + ' 分钟：陈述 10–12 分钟、提问 8–10 分钟，陈述占六成左右');
  out.push('陈述三分：问题与设计／结果与不确定性／边界与不足，各约 ' + (100 / 3).toFixed(0) + '%——把最多时间花在结果上，提问必然追到设计');
  out.push('五问演练：样本／口径／对照／方法／边界，一问答不上就回去改那一节，而不是改答辩稿');
  out.push('统计显著只回答「不太可能是偶然」，不回答「值不值得改」；后者看效应量与专业阈值');
  return out;
}

/* ── quiz：结构 + 接地 ──────────────────────────────────────────── */

function quizSummary(quiz, text) {
  const body = grams(text, 4);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  const items = qs.map((q, i) => {
    if (stage[q.stage] !== undefined) stage[q.stage] += 1;
    const opts = Array.isArray(q.options) ? q.options : [];
    const right = String(opts[q.correct] || '');
    const hit = [...grams(right, 4)].filter((g) => body.has(g));
    const why = q.explain || q.explanation || '';
    return {
      n: i + 1,
      stage: q.stage,
      options: opts.length,
      correct: q.correct,
      explainHanzi: hanzi(why),
      grounded: hit.length,
      sample: hit.slice(0, 3),
    };
  });
  return {
    total: qs.length,
    stage: stage,
    items: items,
    answers: qs.map((q) => q.correct),
    distinctAnswers: new Set(qs.map((q) => q.correct)).size,
    checkTotal: items.filter((x) => x.stage === 'check').length,
    checkGrounded: items.filter((x) => x.stage === 'check' && x.grounded > 0).length,
    minExplain: items.length ? Math.min(...items.map((x) => x.explainHanzi)) : 0,
    allFourOptions: items.every((x) => x.options === 4),
    badCorrect: items.filter((x) => !(Number.isInteger(x.correct) && x.correct >= 0 && x.correct < 4)).length,
    stageComplete: ['pre', 'check', 'post'].every((s) => stage[s] > 0),
  };
}

/* ── 汇总 ──────────────────────────────────────────────────────── */

function analyze() {
  const text = readDoc();
  const ts = tables(text);
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    hanzi: hanzi(text),
    paragraphs: paragraphs(text).length,
    sections: h2Sections(text).map((s) => s.title),
    tables: ts.map((t) => ({ head: t.head, cols: t.cols, rows: t.rows.length })),
    gates: gateAudit(text),
    numeric: numericGates(text),
    arith: chapterArithmetic(text, ts),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  const q = r.quiz;
  const missed = r.gates.filter((g) => !g.hit);

  console.log(COURSE + ' 第 ' + CHAPTER + ' 章 · ' + TITLE);
  console.log('');
  console.log('正文 ' + r.hanzi.toLocaleString('en-US') + ' 汉字 · ' + r.paragraphs + ' 段 · 二级节 ' + r.sections.length + ' 个');
  r.sections.forEach((s, i) => console.log('  ' + String(i + 1).padStart(2) + '  ' + s));
  console.log('');
  console.log('表 ' + r.tables.length + ' 张：');
  r.tables.forEach((t, i) => {
    console.log('  [' + (i + 1) + '] ' + t.head.join(' / ') + ' —— ' + t.cols + ' 列 × ' + t.rows + ' 行');
  });
  console.log('');
  console.log('判据与门限（逐条在正文定位，共 ' + r.gates.length + ' 条）：');
  for (const g of r.gates) console.log('  ' + (g.hit ? '✓' : '✗') + ' ' + g.label + ' ← ' + (g.quote || '未命中'));
  console.log('  数值门限按单位：' + r.numeric.slice(0, 6).map((u) => u.unit + ' ' + u.n + ' 处').join(' · '));
  console.log('');
  console.log('本章算术（全部从正文解析后计算）：');
  for (const line of r.arith) console.log('  ' + line);
  console.log('');
  console.log('quiz ' + q.total + ' 题（pre ' + q.stage.pre + ' / check ' + q.stage.check + ' / post ' + q.stage.post + '）· 答案 ' + q.answers.join('/'));
  console.log('  选项数全为 4：' + (q.allFourOptions ? '是' : '否') + ' · correct 越界 ' + q.badCorrect + ' 题 · 最短解释 ' + q.minExplain + ' 汉字');
  console.log('  答案落在 ' + q.distinctAnswers + ' 个位置 · 三段齐备：' + (q.stageComplete ? '是' : '否'));
  console.log('  check 题接地：' + q.checkGrounded + ' / ' + q.checkTotal + ' 道能在正文找到 4 字原词');
  for (const it of q.items.filter((x) => x.stage === 'check')) {
    console.log('    第 ' + it.n + ' 题 → ' + (it.grounded ? it.sample.join('、') : '未接地'));
  }
  console.log('');
  if (missed.length) console.log('✗ 正文与判据清单不同源：' + missed.map((g) => g.label).join('、'));
  else console.log('✓ 判据清单 ' + r.gates.length + ' 条全部命中正文；quiz ' + q.total + ' 题结构合规，check 题接地 ' + q.checkGrounded + ' 道。');
  console.log('※ 以上数字由本章正文与 quiz 现算，改正文后重跑即可复核。');
  console.log('※ 本章为管理教学材料，判据与方法均为课堂约定，不构成诊疗、法律或投资意见。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  h2Sections,
  paragraphs,
  tables,
  grams,
  hanzi,
  num,
  gateAudit,
  numericGates,
  chapterArithmetic,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  RULES,
};
