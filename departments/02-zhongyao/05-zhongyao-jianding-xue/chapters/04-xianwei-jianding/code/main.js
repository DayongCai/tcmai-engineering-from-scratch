#!/usr/bin/env node
/**
 * 中药鉴定学 · 第 4 章 显微报告里没有标定值，就等于没有数字
 *
 *   node code/main.js
 *
 * 正文：chapters/04-xianwei-jianding/docs/zh.md
 * 习题：chapters/04-xianwei-jianding/quiz.json
 * 依赖：仅 Node.js 标准库
 *
 * 只读本章正文与本章 quiz，不读任何标准表：正文改了，这里的数跟着变。
 *   · 规模：汉字、段、节标题、表格张数与每张表的列数／行数
 *   · 算术：台尺与目尺的标定对账、特征与装片的项数对账、表格行累计、测量点数合计
 *   · quiz：题量、三段分布、选项数、解释长度、答案位置是否打散、check 题能否在正文找到原词
 * 任一项对不上，脚本以 1 退出——说明正文、代码、习题三者已经不同源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 4;
const SLUG = '04-xianwei-jianding';
const TITLE = '显微报告里没有标定值，就等于没有数字';

/* ── 文本口径 ────────────────────────────────────────────────────── */

const CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
const cn = (ch) => CN[ch] || 0;
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const readDoc = () => fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
const docLines = (doc) => String(doc).split(/\r?\n/);

/** 取第一个匹配的数字；取不到就是 null，绝不填默认值 */
const num = (text, re) => {
  const m = String(text).match(re);
  return m ? Number(m[1]) : null;
};
const groups = (text, re) => {
  const m = String(text).match(re);
  return m ? m.slice(1) : null;
};

/** 节标题：`## 一、…` */
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

/** markdown 表格：表头 + 去分隔行的数据行；围栏代码块里的竖线不算表 */
function tables(doc) {
  const ls = docLines(doc);
  const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const out = [];
  let i = 0;
  let fenced = false;
  while (i < ls.length) {
    if (/^\s*```/.test(ls[i])) {
      fenced = !fenced;
      i += 1;
      continue;
    }
    if (!fenced && /^\s*\|/.test(ls[i])) {
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

/** 截一段正文：从标题关键字到下一个二级标题 */
function sliceBetween(doc, from, to) {
  const a = doc.indexOf(from);
  if (a < 0) return '';
  const b = to ? doc.indexOf(to, a + from.length) : -1;
  return b < 0 ? doc.slice(a) : doc.slice(a, b);
}

/* ── 本章算术（全部从正文解析，不写死结果） ─────────────────────── */

/**
 * 本章的三笔账：
 *   1) 台尺换算：格数 × 每格微米数 = 全长毫米数 × 1000
 *   2) 目尺标定：M 格台尺 ÷ N 格目尺 × 台尺每格 = 正文给出的标定值
 *   3) 项数对账：正文说的「六类特征／四种装片」与枚举项、表行数三处必须同数
 */
function arithmetic(doc, ts) {
  // 1) 台尺：全长 1 mm、分 100 格、每格 10 μm
  const stageCells = num(doc, /分\s*(\d+)\s*格/);
  const stagePerCell = num(doc, /每格\s*(\d+(?:\.\d+)?)\s*μm/);
  const stageLengthMm = num(doc, /全长\s*(\d+(?:\.\d+)?)\s*mm/);
  const stageTotalUm = stageCells * stagePerCell;
  const stageTotalMm = stageTotalUm / 1000;
  const stageOk = stageTotalMm === stageLengthMm;

  // 2) 目尺标定：若 M = 10、N = 100，得 1 μm
  const cal = groups(doc, /M\s*=\s*(\d+)、N\s*=\s*(\d+)，得\s*([\d.]+)\s*μm/);
  const calibM = cal ? Number(cal[0]) : null;
  const calibN = cal ? Number(cal[1]) : null;
  const calibStated = cal ? Number(cal[2]) : null;
  const calibPerCell = cal ? (calibM * stagePerCell) / calibN : null;
  const calibOk = calibPerCell === calibStated;

  // 3) 六类特征：中文数字、枚举项、表格行数三处同数
  const feat = groups(doc, /归为([一二三四五六七八九十])类：([^。]+)/);
  const featStated = feat ? cn(feat[0]) : null;
  const featItems = feat ? feat[1].replace(/\*\*/g, '').split('、').map((s) => s.trim()).filter(Boolean) : [];
  const featTable = tableBy(ts, '形态要点');
  const featRows = featTable ? featTable.rows.length : 0;

  // 4) 四种装片：一句里用「；」并列，段末以「N 片配合」收口
  const slidePara = paragraphs(doc).find((p) => p.includes('装片要组合用')) || '';
  const slideItems = slidePara ? slidePara.split('：')[1].split('。')[0].split('；').map((s) => s.trim()).filter(Boolean) : [];
  const slideMatch = doc.match(/([一二三四五六七八九十])片配合/);
  const slideStated = slideMatch ? cn(slideMatch[1]) : null;

  // 5) 测量点数：同一特征测 N 个 × 特征类数
  const perFeature = num(doc, /同一特征测约\s*(\d+)\s*个/);
  const points = perFeature && featItems.length ? perFeature * featItems.length : null;

  // 6) 表格行列累计
  const rowTotal = ts.reduce((n, t) => n + t.rows.length, 0);
  const colTotal = ts.reduce((n, t) => n + t.cols, 0);

  // 7) 记录字段表与判据组表
  const fieldTable = tableBy(ts, '要求');
  const ruleTable = tableBy(ts, '组内要有哪几项');

  // 8) 四种失效：第 4 节里以「- **…**」起头的条目
  const sec4 = sliceBetween(doc, '## 四、', '## 代价与边界');
  const failures = (sec4.match(/^- \*\*/gm) || []).length;

  // 9) 考核项：①②③④ 编号个数
  const tasks = (doc.match(/[①②③④⑤⑥]/g) || []).length;

  // 10) 装片与特征的覆盖比：一片平均要看几类特征
  const coverPerSlide = slideItems.length ? featItems.length / slideItems.length : null;

  return {
    stageCells,
    stagePerCell,
    stageLengthMm,
    stageTotalUm,
    stageTotalMm,
    stageOk,
    calibM,
    calibN,
    calibStated,
    calibPerCell,
    calibOk,
    featStated,
    featItems,
    featRows,
    slideStated,
    slideItems,
    perFeature,
    points,
    rowTotal,
    colTotal,
    ruleRows: ruleTable ? ruleTable.rows.length : 0,
    fieldRows: fieldTable ? fieldTable.rows.length : 0,
    failures,
    tasks,
    coverPerSlide,
    lines: [
      `台尺：${stageCells} 格 × ${stagePerCell} μm = ${stageTotalUm} μm = ${stageTotalMm} mm，与正文「全长 ${stageLengthMm} mm」对得上：${stageOk ? '是' : '否'}`,
      `目尺标定：台尺 ${calibM} 格 ÷ 目尺 ${calibN} 格 × ${stagePerCell} μm = ${calibPerCell} μm/格，与正文给出的 ${calibStated} μm 对得上：${calibOk ? '是' : '否'}（换物镜后此值作废，须重标）`,
      `${featStated} 类特征：枚举 ${featItems.length} 项（${featItems.join('、')}），表格 ${featRows} 行，三处同数：${featStated === featItems.length && featStated === featRows ? '是' : '否'}`,
      `${slideStated} 种装片：枚举 ${slideItems.length} 项，${featItems.length} 类特征 ÷ ${slideItems.length} 种装片 = 每种装片平均承担 ${coverPerSlide.toFixed(2)} 类`,
      `测量点数：同一特征测 ${perFeature} 个 × ${featItems.length} 类 = ${points} 个读数，才够取均值与变动范围`,
      `表格累计：${ts.length} 张表共 ${rowTotal} 行 × ${colTotal} 列（判据组 ${ruleTable ? ruleTable.rows.length : 0} 组，记录字段 ${fieldTable ? fieldTable.rows.length : 0} 条）`,
      `第 4 节列四种失效 ${failures} 条，考核项 ${tasks} 项`,
    ],
  };
}

/* ── quiz：结构 + 接地 ──────────────────────────────────────────── */

/** 正文里 4 字以上的连续汉字片段 */
function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

function quizCheck(quiz, doc) {
  const body = grams(doc);
  const hanziOf = (s) => hanzi(s);
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
      explainHanzi: hanziOf(why),
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
    allFourOptions: items.length > 0 && items.every((x) => x.options === 4),
    badCorrect: items.filter((x) => !(Number.isInteger(x.correct) && x.correct >= 0 && x.correct < 4)).length,
    stageComplete: ['pre', 'check', 'post'].every((s) => stage[s] > 0),
  };
}

/* ── 汇总与自检 ────────────────────────────────────────────────── */

function analyze() {
  const doc = readDoc();
  const ts = tables(doc);
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    docHanzi: hanzi(doc),
    paragraphs: paragraphs(doc).length,
    sections: sections(doc),
    tables: ts.map((t) => ({ header: t.header, cols: t.cols, rows: t.rows.length })),
    arith: arithmetic(doc, ts),
    quiz: quizCheck(quiz, doc),
  };
}

/** 自检：任何一项不成立都返回一条中文说明 */
function verify(r) {
  const bad = [];
  const a = r.arith;
  const q = r.quiz;

  if (r.docHanzi < 2500) bad.push(`正文只有 ${r.docHanzi} 汉字，低于 2500`);
  if (r.sections.length < 4 || r.sections.length > 8) bad.push(`二级小节 ${r.sections.length} 个，超出 4–8`);
  if (r.tables.length < 1) bad.push('正文没有表格');

  if (!a.stageOk) bad.push(`台尺换算对不上：${a.stageCells} 格 × ${a.stagePerCell} μm ≠ ${a.stageLengthMm} mm`);
  if (!a.calibOk) bad.push(`目尺标定对不上：算得 ${a.calibPerCell} μm/格，正文写 ${a.calibStated} μm`);
  if (a.featStated !== a.featItems.length) bad.push(`特征类数对不上：正文说 ${a.featStated} 类，枚举 ${a.featItems.length} 项`);
  if (a.featStated !== a.featRows) bad.push(`特征类数与表行数对不上：${a.featStated} 类 / ${a.featRows} 行`);
  if (a.slideStated !== a.slideItems.length) bad.push(`装片种数对不上：正文说 ${a.slideStated} 种，枚举 ${a.slideItems.length} 项`);
  if (!a.points) bad.push('测量点数算不出来：正文缺「同一特征测 N 个」或特征类数');

  if (q.total < 5) bad.push(`quiz 只有 ${q.total} 题，需 ≥5`);
  if (!q.stageComplete) bad.push(`quiz 三段不全：pre ${q.stage.pre} / check ${q.stage.check} / post ${q.stage.post}`);
  if (!q.allFourOptions) bad.push('quiz 有题的选项数不是 4');
  if (q.badCorrect) bad.push(`quiz 有 ${q.badCorrect} 题的 correct 下标越界`);
  if (q.minExplain < 30) bad.push(`quiz 最短解释 ${q.minExplain} 汉字，需 ≥30`);
  if (q.checkGrounded < 2) bad.push(`quiz 只有 ${q.checkGrounded} 道 check 题能在正文找到原词，需 ≥2`);
  if (q.distinctAnswers < 3) bad.push(`quiz 答案只落在 ${q.distinctAnswers} 个位置，需 ≥3`);
  return bad;
}

function report(r, bad) {
  const a = r.arith;
  console.log(`中药鉴定学 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log(`正文 ${r.docHanzi} 汉字 · ${r.paragraphs} 段 · 节 ${r.sections.length} 个`);
  console.log('');
  console.log('结构：');
  for (const s of r.sections) console.log(`  ${s}`);
  console.log('');
  console.log(`表 ${r.tables.length} 张：`);
  r.tables.forEach((t, i) => console.log(`  [${i + 1}] ${t.header.join(' / ')} —— ${t.cols} 列 × ${t.rows} 行`));
  console.log('');
  console.log('本章算术（全部从正文解析后计算）：');
  for (const line of a.lines) console.log(`  ${line}`);
  console.log('');
  console.log(`quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· 答案 ${r.quiz.answers.join('/')}`);
  console.log(`  check 题接地 ${r.quiz.checkGrounded} 道 · 答案落在 ${r.quiz.distinctAnswers} 个位置 · 最短解释 ${r.quiz.minExplain} 汉字`);
  console.log('');
  if (bad.length) {
    console.log(`✗ 自检 ${bad.length} 项不成立：`);
    for (const b of bad) console.log(`  - ${b}`);
  } else {
    console.log('✓ 自检全部成立：正文、算术、quiz 三者同源。');
  }
  console.log('※ 以上数字由本章正文与 quiz 现算，改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，讲制片、特征辨识与测量记录的方法，不构成任何药材的检验结论，也不替代法定检验机构的判定。');
}

function main() {
  const r = analyze();
  const bad = verify(r);
  report(r, bad);
  if (bad.length) process.exit(1);
}

if (require.main === module) main();

module.exports = {
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  readDoc,
  sections,
  paragraphs,
  tables,
  tableBy,
  sliceBetween,
  arithmetic,
  grams,
  hanzi,
  num,
  groups,
  quizCheck,
  analyze,
  verify,
};
