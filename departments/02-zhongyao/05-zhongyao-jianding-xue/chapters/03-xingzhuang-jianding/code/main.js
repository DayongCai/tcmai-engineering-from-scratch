#!/usr/bin/env node
/**
 * 中药鉴定学 · 第 3 章 性状鉴定没有仪器，八项描述就是它的仪器：正文与习题自检
 *
 *   node code/main.js
 *
 * 正文：chapters/03-xingzhuang-jianding/docs/zh.md
 * 习题：chapters/03-xingzhuang-jianding/quiz.json
 * 依赖：仅 Node.js 标准库
 *
 * 只读本章正文与本章习题，不读任何外部取数表：正文改了，这里的数字跟着变。
 *   · 规模：汉字、段、二级与三级节、每张表的列数／数据行数
 *   · 本章算术：表行列累计；八项描述的覆盖面（眼看六项占几分之几）、
 *     判据组的项数与均值、禁尝药材的味数、水试与火试的例数、失效模式数
 *   · 习题：题量、三段分布、四选项、答案位置是否打散、接地题数、最短解释
 * 任一自检不过，退出码 1 —— 说明正文、代码、习题三者已经不同源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 3;
const SLUG = '03-xingzhuang-jianding';
const TITLE = '性状鉴定没有仪器，八项描述就是它的仪器';

/* ── 文本口径 ────────────────────────────────────────────────────── */

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const readDoc = () => fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
const docLines = (doc) => String(doc).split(/\r?\n/);

const CN = { 零: 0, 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
const cn2n = (s) => (Object.prototype.hasOwnProperty.call(CN, s) ? CN[s] : Number(s));

/** 按分隔符切，括号内的不切 */
function splitTop(s, sep = '、') {
  const OPEN = '（(【';
  const CLOSE = '）)】';
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of String(s)) {
    if (OPEN.includes(ch)) depth += 1;
    if (CLOSE.includes(ch)) depth = Math.max(0, depth - 1);
    if (ch === sep && depth === 0) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}

/** 节标题：二级 `## `，三级 `### ` */
function headings(doc) {
  const h2 = [];
  const h3 = [];
  for (const l of docLines(doc)) {
    if (/^###\s+/.test(l)) h3.push(l.replace(/^###\s+/, '').trim());
    else if (/^##\s+/.test(l)) h2.push(l.replace(/^##\s+/, '').trim());
  }
  return { h2, h3, total: h2.length + h3.length };
}

/** 段：非空，不以标题、引文、表格行、清单符号或编号起始 */
function paragraphs(doc) {
  return docLines(doc)
    .map((l) => l.trim())
    .filter((l) => l && !/^[#>|]/.test(l) && !/^[-*+]\s/.test(l) && !/^\d+[.、]/.test(l))
    .filter((l) => !l.includes('|'));
}

/** markdown 表格：表头 + 去掉分隔行后的数据行 */
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
      const rows = block
        .slice(1)
        .filter((l) => !/^\s*\|[\s:|-]+\|\s*$/.test(l))
        .map(cells);
      out.push({ header, cols: header.length, rows });
    } else {
      i += 1;
    }
  }
  return out;
}

const tableBy = (ts, kw) => ts.find((t) => t.header.join(' ').includes(kw));

/** 把「A + B」也当分隔符的项数 */
const itemCount = (cell) => splitTop(String(cell).replace(/\s\+\s/g, '、')).length;

/* ── 本章算术（全部从正文解析后计算） ───────────────────────────── */

/** 从「水试看沉浮…：A…；B…；C…。」这类句子里数现象例数（同段前面可能还压着别的句子） */
function phenomena(doc, keyword) {
  const at = String(doc).indexOf(keyword + '看');
  if (at < 0) return { segments: [], count: 0 };
  const tail = String(doc).slice(at);
  const stop = tail.indexOf('。');
  const para = stop >= 0 ? tail.slice(0, stop) : tail;
  const after = para.slice(para.indexOf('：') + 1);
  const segments = splitTop(after, '；');
  return { segments, count: segments.length };
}

function arithmetic(doc, ts) {
  /* 表行列累计 */
  const tableRows = ts.reduce((a, t) => a + t.rows.length, 0);
  const tableCells = ts.reduce((a, t) => a + t.cols * t.rows.length, 0);

  /* 八项：项数取自性状项表；眼看覆盖几项取自正文「能覆盖六项」 */
  const itemTable = tableBy(ts, '观察什么');
  if (!itemTable) throw new Error('正文里找不到性状八项表');
  const items = itemTable.rows.map((r) => r[0]);
  const covered = cn2n((doc.match(/能覆盖([一二三四五六七八九十])项/) || [])[1]);
  const coverShare = covered / items.length;

  /* 顺序四句与四种手段 */
  const orderSeg = (doc.match(/顺序是四句话：\*\*([^*]+)\*\*/) || [])[1] || '';
  const order = splitTop(orderSeg);
  const means = ['眼看', '手摸', '鼻闻', '口尝'].filter((m) => doc.includes('**' + m + '**'));

  /* 口尝三条规矩与禁尝药材 */
  const ruleSeg = (doc.match(/规矩是三条：([^。]+)/) || [])[1] || '';
  const tasteRules = splitTop(ruleSeg);
  const bannedSeg = (doc.match(/毒性药材禁尝\*\*——([^。]+)/) || [])[1] || '';
  const banned = splitTop(bannedSeg).map((x) => String(x).split(/[，；。]/)[0].replace(/等$/, '').trim()).filter(Boolean);

  /* 成组判据 */
  const groupTable = tableBy(ts, '判据组');
  if (!groupTable) throw new Error('正文里找不到成组判据表');
  const groups = groupTable.rows.map((r) => ({ name: r[0], items: itemCount(r[1]) }));
  const groupItems = groups.reduce((a, g) => a + g.items, 0);

  /* 水试与火试的行为判据例数 */
  const water = phenomena(doc, '水试');
  const fire = phenomena(doc, '火试');

  /* 失效模式与记录字段 */
  const failSeg = doc.slice(doc.indexOf('四种失效，本章最典型'), doc.indexOf('**考核项（本章）**'));
  const failures = (failSeg.match(/^- \*\*/gm) || []).length;
  const recTable = tableBy(ts, '字段');
  const recordSlots = recTable ? recTable.rows.length : 0;
  const taskPara = (doc.match(/\*\*考核项（本章）\*\*：(.+)$/m) || [])[1] || '';
  const tasks = (taskPara.match(/[①②③④⑤⑥]/g) || []).length;

  /* 八项里最难伪造的四项：正文明说「剩下形、色、气、味」 */
  const easySeg = (doc.match(/剩下([^。]+?)四项/) || [])[1] || '';
  const easyToFake = splitTop(easySeg);

  return {
    tableRows,
    tableCells,
    items,
    itemCount: items.length,
    covered,
    coverShare,
    order,
    means,
    tasteRules,
    banned,
    groups,
    groupItems,
    groupMean: groupItems / groups.length,
    water: water.count,
    fire: fire.count,
    failures,
    recordSlots,
    tasks,
    easyToFake,
    lines: [
      `表行列累计：${ts.length} 张表 · ${tableRows} 数据行 · ${tableCells} 个单元格`,
      `八项描述：${items.length} 项（${items.join('、')}）`,
      `眼看覆盖 ${covered} 项 ÷ ${items.length} 项 = ${(coverShare * 100).toFixed(1)}%，其余交给手摸、鼻闻、口尝`,
      `观察顺序 ${order.length} 句：${order.join(' → ')}`,
      `手段 ${means.length} 种：${means.join('、')}；口尝 ${tasteRules.length} 条规矩（${tasteRules.join('／')}）`,
      `禁尝毒性药材 ${banned.length} 味：${banned.join('、')}`,
      `成组判据：${groups.length} 组 ${groupItems} 项（${groups.map((g) => g.name + g.items).join(' / ')}），均 ${(groupItems / groups.length).toFixed(1)} 项/组`,
      `行为判据：水试 ${water.count} 例 + 火试 ${fire.count} 例 = ${water.count + fire.count} 例，都要正品平行对照`,
      `难伪造的四项（正文点名为${easyToFake.length}项）：${easyToFake.join('、')}；八项缺这四项，结论只覆盖 ${((items.length - easyToFake.length) / items.length * 100).toFixed(1)}%`,
      `记录字段 ${recordSlots} 栏；失效模式 ${failures} 种；考核项 ${tasks} 条`,
    ],
  };
}

/* ── 习题：结构 + 接地 ─────────────────────────────────────────── */

/** 正文里 4 字以上的连续汉字片段 */
function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

// 旧脚手架词按码点写，脚本自身不带出这些字样；正文或习题里出现即报警
const FINGERPRINTS = [
  /\u4e09\u8fa8/, /\u56db\u4f4d\u9762/, /\u5355\u5143\u89c4\u6a21/, /\u672c\u7ae0\u5b9e\u6d4b/,
  /\u672c\u8bfe\u7b2c\s*\d+\s*\u7ae0[（(]/,
  /\u89c1\s*code\/main\.js\s*\u8f93\u51fa/,
];
const fingerprintsIn = (s) => FINGERPRINTS.map((re) => (re.exec(String(s || '')) || [''])[0]).filter(Boolean);

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
  const answers = qs.map((q) => q.correct);
  let longestRun = answers.length ? 1 : 0;
  let run = 1;
  for (let i = 1; i < answers.length; i += 1) {
    if (answers[i] === answers[i - 1]) {
      run += 1;
      longestRun = Math.max(longestRun, run);
    } else {
      run = 1;
    }
  }
  return {
    total: qs.length,
    stage,
    items,
    answers,
    distinctAnswers: new Set(answers).size,
    longestRun,
    checkTotal: items.filter((x) => x.stage === 'check').length,
    checkGrounded: items.filter((x) => x.stage === 'check' && x.grounded > 0).length,
    minExplain: items.length ? Math.min(...items.map((x) => x.explainHanzi)) : 0,
    allFourOptions: items.length > 0 && items.every((x) => x.options === 4),
    badCorrect: items.filter((x) => !(Number.isInteger(x.correct) && x.correct >= 0 && x.correct < x.options)).length,
    stageComplete: ['pre', 'check', 'post'].every((s) => stage[s] > 0),
  };
}

/* ── 汇总与自检 ────────────────────────────────────────────────── */

function analyze() {
  const doc = readDoc();
  const ts = tables(doc);
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const q = quizSummary(quiz, doc);
  return {
    docHanzi: hanzi(doc),
    paragraphs: paragraphs(doc).length,
    headings: headings(doc),
    tables: ts.map((t) => ({ header: t.header, cols: t.cols, rows: t.rows.length })),
    arith: arithmetic(doc, ts),
    quiz: q,
    docFingerprint: fingerprintsIn(doc),
    quizFingerprint: fingerprintsIn(JSON.stringify(quiz)),
  };
}

function gates(r) {
  const q = r.quiz;
  const fails = [];
  if (q.total < 5) fails.push(`题量 ${q.total} 题，需 ≥5`);
  for (const s of ['pre', 'check', 'post']) if (!q.stage[s]) fails.push(`缺 ${s} 段`);
  if (q.stage.check < 2) fails.push(`check 段 ${q.stage.check} 题，需 ≥2`);
  if (!q.allFourOptions) fails.push('有题不是 4 个选项');
  if (q.badCorrect) fails.push(`correct 下标非法 ${q.badCorrect} 处`);
  if (q.distinctAnswers < 3) fails.push(`答案只落在 ${q.distinctAnswers} 个位置，需 ≥3`);
  if (q.longestRun > 2) fails.push(`答案同位连排 ${q.longestRun} 次，需 ≤2`);
  if (q.checkGrounded < 2) fails.push(`接地 check 题 ${q.checkGrounded} 道，需 ≥2`);
  if (q.minExplain < 30) fails.push(`最短解释 ${q.minExplain} 汉字，需 ≥30`);
  if (r.docFingerprint.length) fails.push('正文含旧脚手架字样：' + r.docFingerprint.join(' '));
  if (r.quizFingerprint.length) fails.push('习题含旧脚手架字样：' + r.quizFingerprint.join(' '));
  if (r.arith.itemCount !== 8) fails.push(`八项描述解析出 ${r.arith.itemCount} 项，应为 8`);
  if (r.arith.banned.length < 1) fails.push('正文里读不出禁尝药材清单');
  return fails;
}

function main() {
  const r = analyze();
  const a = r.arith;
  const q = r.quiz;
  console.log(`中药鉴定学 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log(`正文 ${r.docHanzi} 汉字 · ${r.paragraphs} 段 · 二级节 ${r.headings.h2.length} 个 · 三级节 ${r.headings.h3.length} 个`);
  console.log('');
  console.log(`表 ${r.tables.length} 张（列 × 数据行）：`);
  r.tables.forEach((t, i) => console.log(`  [${i + 1}] ${t.header.join(' / ')} —— ${t.cols} 列 × ${t.rows} 行`));
  console.log('');
  console.log('本章算术（从正文解析后现算）：');
  for (const line of a.lines) console.log('  ' + line);
  console.log('');
  console.log(`quiz ${q.total} 题（pre ${q.stage.pre} / check ${q.stage.check} / post ${q.stage.post}）· 答案 ${q.answers.join('/')}`);
  console.log(`  check 接地 ${q.checkGrounded}/${q.checkTotal} · 答案落 ${q.distinctAnswers} 个位置 · 同位连排 ${q.longestRun} · 最短解释 ${q.minExplain} 汉字`);
  for (const it of q.items) {
    console.log(`  ${it.n}. [${it.stage}] 选项 ${it.options} · 正确 ${it.correct} · 解释 ${it.explainHanzi} 字 · 接地词 ${it.sample.join('、') || '—'}`);
  }
  console.log('');
  const fails = gates(r);
  if (fails.length) {
    console.error(`自检未通过（${fails.length} 项）：`);
    for (const f of fails) console.error('  - ' + f);
    process.exitCode = 1;
  } else {
    console.log('自检：通过（题量与三段齐、四选项、答案打散、接地 ≥2、解释 ≥30 汉字、八项齐全）');
  }
  console.log('※ 以上数字由本章正文与习题现算，改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，判据与分档均为课堂约定，不构成真伪结论或用药建议。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  arithmetic,
  gates,
  quizSummary,
  readDoc,
  headings,
  paragraphs,
  tables,
  tableBy,
  splitTop,
  itemCount,
  phenomena,
  grams,
  hanzi,
  cn2n,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
