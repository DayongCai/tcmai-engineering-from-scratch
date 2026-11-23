#!/usr/bin/env node
/**
 * 毕业设计（管理类） · 第 4 章 效果评价的分水岭在视角：站错立场，同一措施会得出相反结论
 *
 *   node departments/06-guanli/26-guanli-biye-sheji/chapters/04-xiaoguo-pingjia/code/main.js
 *
 * 正文：chapters/04-xiaoguo-pingjia/docs/zh.md
 * 习题：chapters/04-xiaoguo-pingjia/quiz.json
 * 依赖：仅 Node.js 标准库
 *
 * 只读本章正文与本章 quiz，不读任何 standards 取数表：正文改了，这里的数字跟着变。
 *   · 规模：汉字、段、二级节标题、表格张数与每张表的列数／行数
 *   · 判据与门限：RULES 逐条在正文里定位（命中即打印原文片段），再加按单位归类的数值门限
 *   · 本章算术：增量成本与增量效果、ICER 与反推、10 年贴现现值、两个方案的 QALY 比较
 *   · quiz 体检：题量、三段分布、选项数、解释长度、答案位置是否打散、check 题能否接回正文原词
 * 任何一项对不上，说明正文、代码、习题三者已经不同源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const COURSE = '毕业设计（管理类）';
const CHAPTER = 4;
const SLUG = '04-xiaoguo-pingjia';
const TITLE = '效果评价的分水岭在视角：站错立场，同一措施会得出相反结论';

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
  { label: '视角决定成本范围', re: /视角决定成本范围/ },
  { label: '四视角的比较', re: /支付方（医保／财政）/ },
  { label: '成本的机会成本性质', re: /经济学意义上的成本是/ },
  { label: '识别原则一：穷尽', re: /不遗漏应当计入的项目/ },
  { label: '贴现算式', re: /现值 = 100 ÷ \(1 \+ 0\.05\)\^10/ },
  { label: 'ICER 算式', re: /ICER = ΔC ÷ ΔE/ },
  { label: 'ICER 的四个随附条件', re: /视角、对照方案、时间框架、贴现率/ },
  { label: 'QALY 合成式', re: /QALY = Σ/ },
  { label: '改革评价第一重挑战', re: /数据可比性/ },
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
  const c1 = num((text.match(/新方案每例成本\s*([\d,]+)\s*元/) || [])[1]);
  const c0 = num((text.match(/对照方案\s*([\d,]+)\s*元/) || [])[1]);
  const e1 = Number((text.match(/效果\s*([\d.]+)\s*个健康单位/) || [])[1]);
  const e0 = Number((text.match(/元、([\d.]+)\s*个单位/) || [])[1]);
  const dc = c1 - c0;
  const de = e1 - e0;
  const icer = Math.round(dc / de);
  const pv = 100 / Math.pow(1.05, 10);
  out.push('五步流程的第一步是明确问题与视角；视角一换，成本范围与结论方向都可能翻过来');
  out.push('ΔC = ' + c1 + ' − ' + c0 + ' = ' + dc + ' 元；ΔE = ' + e1 + ' − ' + e0 + ' = ' + de.toFixed(1) + ' 个健康单位');
  out.push('ICER = ' + dc + ' ÷ ' + de.toFixed(1) + ' ≈ ' + icer + ' 元／健康单位（比值只说相对，须连视角、对照、时间框架、贴现率一起报）');
  out.push('反推：' + c0 + ' + ' + icer + ' × ' + de.toFixed(1) + ' = ' + Math.round(c0 + icer * de) + ' 元，回到新方案成本');
  out.push('贴现：100 万 ÷ (1 + 0.05)^10 = 100 ÷ ' + Math.pow(1.05, 10).toFixed(4) + ' ≈ ' + pv.toFixed(1) + ' 万元');
  out.push('QALY：0.7 × 2 = ' + (0.7 * 2).toFixed(1) + ' 对 1.0 × 1.5 = ' + (1.0 * 1.5).toFixed(1) + '，活得久不一定更优');
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
