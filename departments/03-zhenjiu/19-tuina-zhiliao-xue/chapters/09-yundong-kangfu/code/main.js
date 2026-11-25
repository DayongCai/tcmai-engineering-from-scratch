#!/usr/bin/env node
/**
 * 推拿治疗学 · 第 9 章 运动损伤的手法表只有一张，日期表有四张
 *
 *   node code/main.js
 *
 * 正文：departments/03-zhenjiu/19-tuina-zhiliao-xue/chapters/09-yundong-kangfu/docs/zh.md
 * 习题：departments/03-zhenjiu/19-tuina-zhiliao-xue/chapters/09-yundong-kangfu/quiz.json
 * 依赖：仅 Node.js 标准库
 *
 * 只读本章正文与本章 quiz，不读任何 standards 取数表：正文改了，这里的数字跟着变。
 *   · 结构：汉字、段、节标题、表格张数与每张表的列数／行数、按节切出的单元
 *   · 本章算术：从正文里解析条目、阈值与分档，再算派生量
 *   · quiz：题量、三段分布、选项数、解释长度、答案位置、check 题能否在正文找到原句
 * 任一项对不上，说明正文、代码、习题三者已经不同源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 9;
const SLUG = '09-yundong-kangfu';
const TITLE = '运动损伤的手法表只有一张，日期表有四张';
const TERMS = ["急性期","恢复期","骨折","康复","转诊","RICE"];

/* ── 文本口径 ────────────────────────────────────────────────── */

const readDoc = () => fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
const docLines = (doc) => String(doc).split(/\r?\n/);
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const count = (text, term) => String(text).split(term).length - 1;
const num = (s) => Number(String(s).replace(/[,，\s]/g, ''));

/** 节标题：`## 一、…` */
function sections(doc) {
  return docLines(doc).filter((l) => /^##\s+/.test(l)).map((l) => l.replace(/^##\s+/, '').trim());
}

/** 段：非空，不以标题、引文、表格行或清单符号起始 */
function paragraphs(doc) {
  return docLines(doc)
    .map((l) => l.trim())
    .filter((l) => l && !/^[#>|]/.test(l) && !/^[-*+]\s/.test(l) && !/^\d+[.、]/.test(l))
    .filter((l) => !l.includes('|'));
}

/** markdown 表格：表头 + 去分隔行的数据行 */
function tables(doc) {
  const ls = docLines(doc);
  const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const out = [];
  let i = 0;
  while (i < ls.length) {
    if (/^\s*\|/.test(ls[i])) {
      const block = [];
      while (i < ls.length && /^\s*\|/.test(ls[i])) {
        block.push(ls[i]);
        i += 1;
      }
      const header = cells(block[0]);
      const rows = block.slice(1).filter((l) => !/^\s*\|[\s:|-]+\|\s*$/.test(l)).map(cells);
      out.push({ header, cols: header.length, rows });
    } else {
      i += 1;
    }
  }
  return out;
}

const tableBy = (ts, kw) => ts.find((t) => t.header.join(' ').includes(kw));

/** 括号、书名号内的顿号不算分隔：按顶层「、」切分条目 */
function splitItems(text) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of String(text || '')) {
    if ('（(「'.includes(ch)) depth += 1;
    else if ('）)」'.includes(ch)) depth = Math.max(0, depth - 1);
    if (ch === '、' && depth === 0) {
      if (cur.trim()) out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/* ── 本章算术（逐章注入，全部从正文解析） ───────────────────── */

function chapterArithmetic(doc, ts) {
  const found = (arr) => arr.filter((k) => doc.indexOf(k) >= 0);
  const dates = found(['24～48 小时', '48～72 小时', '1～2 周', '2 周至 6 个月']);
  const fracturePhases = found(['早期（伤后 1～2 周）', '中期（2～4 周至 3 个月', '晚期（3～6 个月以上）']);
  const strokePhases = found(['弛缓期', '痉挛期']);
  const dateTable = tableBy(ts, '对象');
  const course = (doc.match(/疗程/g) || []).length;
  const referrals = (doc.match(/转诊/g) || []).length;
  const safety = (doc.match(/禁用|禁忌|慎用|转诊|红线/g) || []).length;
  return {
    dates: dates.length,
    dateRows: dateTable ? dateTable.rows.length : 0,
    fracturePhases: fracturePhases.length,
    strokePhases: strokePhases.length,
    course: course,
    referrals: referrals,
    safety: safety,
    lines: [
      '日期表 ' + (dateTable ? dateTable.rows.length : 0) + ' 行（' + dates.length + ' 个时点命中：' + dates.join('、') + '）',
      '骨折康复 ' + fracturePhases.length + ' 段 · 卒中 ' + strokePhases.length + ' 期',
      '疗程 ' + course + ' 处 · 转诊 ' + referrals + ' 处 · 安全字样 ' + safety + ' 处',
      '规矩：最重的伤不是等得最久的，等待长度由组织处在哪个修复阶段决定',
    ],
  };
}

/* ── quiz：结构 + 接地 ──────────────────────────────────────── */

/** 正文里 n 字以上的连续汉字片段 */
function grams(text, n) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** 选项里最长的一段「在正文里找得到」的连续汉字长度 */
function quoteRun(option, doc) {
  const body = String(doc).replace(/[^\u4e00-\u9fff]/g, ' ');
  let best = 0;
  for (const seg of String(option || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i < seg.length; i += 1) {
      for (let j = seg.length; j - i > best; j -= 1) {
        if (body.includes(seg.slice(i, j))) {
          best = j - i;
          break;
        }
      }
    }
  }
  return best;
}

function quizSummary(quiz, doc) {
  const body4 = grams(doc, 4);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  const items = qs.map((q, i) => {
    if (stage[q.stage] !== undefined) stage[q.stage] += 1;
    const opts = Array.isArray(q.options) ? q.options : [];
    const right = String(opts[q.correct] || '');
    const why = q.explain || q.explanation || '';
    return {
      n: i + 1,
      stage: q.stage,
      options: opts.length,
      correct: q.correct,
      explainHanzi: hanzi(why),
      grounded4: [...grams(right, 4)].some((g) => body4.has(g)),
      quote: quoteRun(right, doc),
    };
  });
  return {
    total: qs.length,
    stage,
    items,
    answers: qs.map((q) => q.correct),
    distinctAnswers: new Set(qs.map((q) => q.correct)).size,
    checkGrounded4: items.filter((x) => x.stage === 'check' && x.grounded4).length,
    checkQuoted6: items.filter((x) => x.stage === 'check' && x.quote >= 6).length,
    minExplain: items.length ? Math.min(...items.map((x) => x.explainHanzi)) : 0,
    maxExplain: items.length ? Math.max(...items.map((x) => x.explainHanzi)) : 0,
    allFourOptions: items.every((x) => x.options === 4),
    badCorrect: items.filter((x) => !(Number.isInteger(x.correct) && x.correct >= 0 && x.correct < 4)).length,
    stageComplete: ['pre', 'check', 'post'].every((s) => stage[s] > 0),
  };
}

/* ── 单元：按 `## ` 切正文，每节一个单元 ───────────────────── */

function chapterUnits(doc) {
  const out = [];
  let seen = false;
  for (const line of docLines(doc)) {
    if (/^##\s+/.test(line)) {
      seen = true;
      const n = out.filter((u) => u.key !== '00').length + 1;
      out.push({
        key: String(n).padStart(2, '0'),
        title: line.replace(/^##\s+/, '').trim(),
        hanzi: 0,
        paragraphs: 0,
        tableRows: 0,
      });
    } else {
      if (!seen) {
        if (!out.length) out.push({ key: '00', title: '题解（首个节标题之前）', hanzi: 0, paragraphs: 0, tableRows: 0 });
        const pre = out[0];
        pre.hanzi += hanzi(line);
        const pt = line.trim();
        if (pt) pre.paragraphs += 1;
        continue;
      }
      const u = out[out.length - 1];
      u.hanzi += hanzi(line);
      const t = line.trim();
      if (!t) continue;
      if (t.startsWith('|')) u.tableRows += 1;
      else if (!/^[#>]/.test(t) && !/^[-*+]\s/.test(t)) u.paragraphs += 1;
    }
  }
  return out;
}

const chapterKeys = (doc) => chapterUnits(doc).map((u) => u.key);

/* ── 汇总 ───────────────────────────────────────────────────── */

function summarize() {
  const doc = readDoc();
  const ts = tables(doc);
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const units = chapterUnits(doc);
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title: TITLE,
    docHanzi: hanzi(doc),
    paragraphs: paragraphs(doc).length,
    sections: sections(doc),
    tables: ts.map((t) => ({ header: t.header, cols: t.cols, rows: t.rows.length })),
    keys: units.map((u) => u.key),
    units,
    terms: Object.fromEntries(TERMS.map((t) => [t, count(doc, t)])),
    arith: chapterArithmetic(doc, ts),
    quiz: quizSummary(quiz, doc),
  };
}

function main() {
  const r = summarize();
  console.log('═══ 推拿治疗学 · 第 ' + CHAPTER + ' 章 ' + TITLE + ' ═══');
  console.log('正文 ' + r.docHanzi.toLocaleString('en-US') + ' 汉字 · ' + r.paragraphs + ' 段 · 节 ' + r.sections.length + ' 个 · 表 ' + r.tables.length + ' 张');
  console.log('');
  console.log('按节切出的单元 ' + r.units.length + ' 个：');
  for (const u of r.units) console.log('  ' + u.key + '  ' + u.title + '  ' + u.hanzi + ' 字 · ' + u.paragraphs + ' 段');
  console.log('');
  console.log('术语命中：' + Object.entries(r.terms).map(([k, v]) => k + '×' + v).join('  '));
  console.log('');
  console.log('本章算术（全部从正文解析后计算）：');
  for (const line of r.arith.lines) console.log('  ' + line);
  console.log('');
  const q = r.quiz;
  console.log('quiz ' + q.total + ' 题（pre ' + q.stage.pre + ' / check ' + q.stage.check + ' / post ' + q.stage.post + '）· 答案 ' + q.answers.join('/'));
  console.log('  check 题原句接地 ' + q.checkQuoted6 + ' 道（≥6 汉字连续）· 四字词接地 ' + q.checkGrounded4 + ' 道 · 答案落在 ' + q.distinctAnswers + ' 个位置');
  console.log('  解释 ' + q.minExplain + '～' + q.maxExplain + ' 汉字 · 每题四选项 ' + (q.allFourOptions ? '是' : '否') + ' · 下标越界 ' + q.badCorrect + ' 处');
  console.log('');
  console.log('※ 以上数字由本章 docs/zh.md 与 quiz.json 现算，改正文或改题后重跑即可复核。');
  console.log('※ 本章为教学材料，内容不构成诊疗建议，也不能替代医师面诊与规范化培训；具体手法须经系统训练后由具备资质的人员实施。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TERMS,
  chapterKeys,
  chapterUnits,
  summarize,
  analyze: summarize,
  chapterArithmetic,
  quizSummary,
  readDoc,
  sections,
  paragraphs,
  tables,
  tableBy,
  splitItems,
  grams,
  quoteRun,
  hanzi,
  count,
  num,
};
