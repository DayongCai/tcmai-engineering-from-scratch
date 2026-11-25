#!/usr/bin/env node
/**
 * 疾病学基础 · 第 2 章 损伤与适应是同一件事的两头，判据在「还能不能回去」
 *
 *   node code/main.js
 *
 * 只读本章两处：docs/zh.md 与 quiz.json。正文改一个字，下面的数字跟着变。
 *   · 规模：汉字、段、节标题、表格张数与每张表的列数／行数
 *   · 结构核对：解析出来的行数与正文自己写明的条数是否一致，不一致单独标出
 *   · 术语普查：本章关键词在正文里各出现几次
 *   · 派生量：由解析出来的数字现算
 *   · quiz：题量、三段分布、选项数、解释长度、答案位置、check 题与正文的用词重叠
 * 任何一项对不上，说明正文、代码、习题三者已经不同源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 2;
const SLUG = '02-sunshang-yu-shiying';
const TITLE = '损伤与适应是同一件事的两头，判据在「还能不能回去」';

/* ── 文本口径 ─────────────────────────────────────────────── */

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const count = (text, term) => String(text).split(term).length - 1;
const num = (s) => Number(String(s).replace(/[,，\s]/g, ''));
const CN = { 两: 2, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 十二: 12 };
const cn2n = (s) => (CN[s] !== undefined ? CN[s] : Number(s));
const readDoc = () => fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
const docLines = (doc) => String(doc).split(/\r?\n/);

/** 节标题：以 ## 起首的行 */
function sections(doc) {
  return docLines(doc).filter((l) => /^##\s+/.test(l)).map((l) => l.replace(/^##\s+/, '').trim());
}

/** 段：非空，不以标题、引文、表格行、清单符号或编号起始 */
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

const TERMS = ["不可逆","再生","萎缩","肥大","化生","坏死","凋亡","瘢痕"];

const tableBy = (ts, kw) => ts.find((t) => t.header.join(' ').includes(kw));

/* ── 本章结构核对（逐章注入，全部从正文解析） ─────────────── */

function chapterArithmetic(doc, ts) {
  const adapt = tableBy(ts, '形态方向');
  const death = tableBy(ts, '线索');
  const reversible = ['细胞水肿', '脂肪变', '玻璃样变', '黏液样变'].filter((k) => doc.includes(k));
  const marks = ['核浓缩', '核碎裂', '核溶解'].filter((k) => doc.includes(k));
  const necro = ['凝固性', '液化性', '纤维素样', '干酪样'].filter((k) => doc.includes(k));
  const ends = ['溶解吸收', '分离排出', '机化', '包裹', '钙化'].filter((k) => doc.includes(k));
  const regen = ['不稳定细胞', '稳定细胞', '永久性细胞'].filter((k) => doc.includes(k));
  const steps = ['肉芽组织形成', '纤维化', '上皮再生'].filter((k) => doc.includes(k));
  const wantAdapt = cn2n((doc.match(/适应([一二三四五六七八九十]+)型/) || [])[1]);
  const wantNecro = cn2n((doc.match(/分([一二三四五六七八九十]+)型/) || [])[1]);
  const wantEnds = cn2n((doc.match(/结局有([一二三四五六七八九十]+)类/) || [])[1]);

  return {
    lines: [
      '可逆一侧的形态改变 ' + reversible.length + ' 名：' + reversible.join('、'),
      '不可逆一侧的标志落在 3 个位置（核、胞质、间质），核的改变 ' + marks.length + ' 种：' + marks.join('、'),
      '适应表 ' + (adapt ? adapt.rows.length : 0) + ' 行（正文自述 ' + wantAdapt + ' 型，' + ((adapt ? adapt.rows.length : 0) === wantAdapt ? '对得上' : '对不上') + '）；四类判据各 1 条',
      '坏死 ' + necro.length + ' 型（正文自述 ' + wantNecro + ' 型）+ 结局 ' + ends.length + ' 类（正文自述 ' + wantEnds + ' 类）= ' + (necro.length + ends.length) + ' 个类别名',
      '死亡两类的区分线索 ' + (death ? death.rows.length : 0) + ' 组 × 2 类 = ' + (death ? death.rows.length * 2 : 0) + ' 个对照位',
      '再生能力 ' + regen.length + ' 档；修复环节 ' + steps.length + ' 个：' + steps.join('、'),
    ],
  };
}

/* ── 边界条数：正文自己声明的类数 vs 解析出的条目数 ───────── */

function boundary(doc) {
  const m = String(doc).match(/([^。]+)，([一二三四五六七八九十]+)类(?:都|均)不在本课范围/);
  if (!m) return { items: [], declared: 0, ok: false };
  const clause = m[1].split(/[：:]/).pop();
  const items = clause.split('、').map((s) => s.trim()).filter(Boolean);
  return { items, declared: cn2n(m[2]), ok: items.length === cn2n(m[2]) };
}

function termCensus(doc, terms) {
  return terms
    .map((t) => ({ term: t, n: count(doc, t) }))
    .sort((a, b) => b.n - a.n || a.term.localeCompare(b.term, 'zh'));
}

/* ── quiz：结构 + 接地 ────────────────────────────────────── */

/** 正文里 4 字以上的连续汉字片段 */
function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

function quizSummary(quiz, doc) {
  const body = grams(doc);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  const items = qs.map((q, i) => {
    if (stage[q.stage] !== undefined) stage[q.stage] += 1;
    const opts = Array.isArray(q.options) ? q.options : [];
    const right = String(opts[q.correct] || '');
    const hit = [...grams(right)].filter((g) => body.has(g));
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
    stage,
    items,
    answers: qs.map((q) => q.correct),
    distinctAnswers: new Set(qs.map((q) => q.correct)).size,
    checkGrounded: items.filter((x) => x.stage === 'check' && x.grounded > 0).length,
    minExplain: items.length ? Math.min(...items.map((x) => x.explainHanzi)) : 0,
    allFourOptions: items.every((x) => x.options === 4),
    stageComplete: ['pre', 'check', 'post'].every((s) => stage[s] > 0),
  };
}

/* ── 汇总 ─────────────────────────────────────────────────── */

function analyze() {
  const doc = readDoc();
  const ts = tables(doc);
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    docHanzi: hanzi(doc),
    paragraphs: paragraphs(doc).length,
    sections: sections(doc),
    tables: ts.map((t) => ({ header: t.header, cols: t.cols, rows: t.rows.length })),
    arith: chapterArithmetic(doc, ts),
    boundary: boundary(doc),
    terms: termCensus(doc, TERMS),
    quiz: quizSummary(quiz, doc),
  };
}

function main() {
  const r = analyze();
  console.log('疾病学基础 第 ' + CHAPTER + ' 章 · ' + TITLE);
  console.log('正文 ' + r.docHanzi.toLocaleString('en-US') + ' 汉字 · ' + r.paragraphs + ' 段 · 节 ' + r.sections.length + ' 个');
  console.log('');
  console.log('结构：');
  for (const s of r.sections) console.log('  ' + s);
  console.log('');
  console.log('表 ' + r.tables.length + ' 张：');
  r.tables.forEach((t, i) => console.log('  [' + (i + 1) + '] ' + t.header.join(' / ') + ' —— ' + t.cols + ' 列 × ' + t.rows + ' 行'));
  console.log('');
  console.log('本章结构核对（全部从正文解析后计算）：');
  for (const line of r.arith.lines) console.log('  ' + line);
  console.log('');
  console.log('术语普查（正文出现次数）：');
  console.log('  ' + r.terms.map((t) => t.term + ' ' + t.n).join(' · '));
  console.log('');
  const b = r.boundary;
  const tail = b.items.length ? '（' + b.items.join('、') + '）' : '';
  console.log(
    '边界条数：正文声明 ' + (b.declared || '—') + ' 类，句中以顿号分成 ' + b.items.length + ' 段 ' +
    (b.ok ? '—— 一致' : '—— 不等，多半是用「与」把两类并成了一段，需人工核对') + tail
  );
  console.log('');
  const q = r.quiz;
  console.log('quiz ' + q.total + ' 题（pre ' + q.stage.pre + ' / check ' + q.stage.check + ' / post ' + q.stage.post + '）· 答案 ' + q.answers.join('/'));
  console.log('  check 题接地 ' + q.checkGrounded + ' 道 · 答案落在 ' + q.distinctAnswers + ' 个位置 · 最短解释 ' + q.minExplain + ' 汉字');
  console.log('※ 以上数字由本章正文与 quiz 现算，改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，只讲类别与关系，不构成诊疗建议，也不替代执业人员的判断。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  sections,
  paragraphs,
  tables,
  tableBy,
  grams,
  hanzi,
  count,
  num,
  cn2n,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
