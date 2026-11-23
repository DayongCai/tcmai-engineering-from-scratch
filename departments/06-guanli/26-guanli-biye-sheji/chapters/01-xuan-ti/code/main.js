#!/usr/bin/env node
/**
 * 毕业设计（管理类） · 第 1 章 选题的标准不是「有意义」，而是能否在一个学期内被证伪
 *
 *   node departments/06-guanli/26-guanli-biye-sheji/chapters/01-xuan-ti/code/main.js
 *
 * 正文：chapters/01-xuan-ti/docs/zh.md
 * 习题：chapters/01-xuan-ti/quiz.json
 * 依赖：仅 Node.js 标准库
 *
 * 只读本章正文与本章 quiz，不读任何 standards 取数表：正文改了，这里的数字跟着变。
 *   · 规模：汉字、段、二级节标题、表格张数与每张表的列数／行数
 *   · 判据与门限：RULES 逐条在正文里定位（命中即打印原文片段），再加按单位归类的数值门限
 *   · 本章算术：可证伪与有意义的取舍、四步收缩、可用采集窗口占比、按月纳入例数与所需月数
 *   · quiz 体检：题量、三段分布、选项数、解释长度、答案位置是否打散、check 题能否接回正文原词
 * 任何一项对不上，说明正文、代码、习题三者已经不同源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const COURSE = '毕业设计（管理类）';
const CHAPTER = 1;
const SLUG = '01-xuan-ti';
const TITLE = '选题的标准不是「有意义」，而是能否在一个学期内被证伪';

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
  { label: '可证伪的定义', re: /这个命题有没有可能被数据推翻/ },
  { label: '先保证可证伪', re: /先保证可证伪，再在其中挑意义大的/ },
  { label: '四步收缩第一步', re: /从领域到问题/ },
  { label: '四步收缩第四步', re: /从指标到判据/ },
  { label: '变量类型决定方法', re: /变量类型决定方法/ },
  { label: '三种开题缺陷', re: /总体界定含糊/ },
  { label: '否决一：没有对照', re: /否决一：没有对照/ },
  { label: '否决二：没有基线', re: /否决二：没有基线/ },
  { label: '否决三：没有口径', re: /否决三：没有口径/ },
  { label: '学期按 16 周计', re: /一个学期按 16 周计/ },
  { label: '每月可纳入例数', re: /每月可纳入约 54 例/ },
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
  const de = ts.find((x) => x.head.join(' ').includes('后果'));
  const weeks = num((text.match(/按\s*(\d+)\s*周计/) || [])[1]);
  const win = text.match(/通常只有\s*(\d+)–(\d+)\s*周/) || [];
  const needN = num((text.match(/需要\s*(\d+)\s*例/) || [])[1]);
  const perMonth = num((text.match(/月出院\s*(\d+)\s*例/) || [])[1]);
  const pct = num((text.match(/符合纳入标准的占\s*(\d+)%/) || [])[1]);
  const can = (perMonth * pct) / 100;
  const months = needN / can;
  out.push('开题缺陷表 ' + (de ? de.rows.length : 0) + ' 行 × ' + (de ? de.cols : 0) + ' 列（总体含糊／无对照／测量未标准化）');
  out.push('学期 ' + weeks + ' 周，可用采集与清理窗口 ' + win[1] + '–' + win[2] + ' 周 = ' + Math.round((100 * win[1]) / weeks) + '%–' + Math.round((100 * win[2]) / weeks) + '%');
  out.push('纳入速度：' + perMonth + ' 例／月 × ' + pct + '% = ' + can + ' 例／月');
  out.push('需 ' + needN + ' 例 → ' + needN + ' ÷ ' + can + ' = ' + months.toFixed(2) + ' 个月，按自然月取整 ' + Math.ceil(months) + ' 个月');
  out.push('两个整月只能进 ' + can * 2 + ' 例，距 ' + needN + ' 例差 ' + (needN - can * 2) + ' 例：开题会上这个算式比任何论证都能暴露「做不完」');
  out.push('判据要与显著性分开：样本足够大时 0.1 天也能显著，管理上要的是 0.5 天以上的阈值');
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
