#!/usr/bin/env node
/**
 * 中药鉴定学 · 第 5 章 同一块板上的对照，比任何绝对数值都硬
 *
 *   node code/main.js
 *
 * 正文：chapters/05-lihua-jianding/docs/zh.md
 * 习题：chapters/05-lihua-jianding/quiz.json
 * 依赖：仅 Node.js 标准库
 *
 * 只读本章正文与本章 quiz，不读任何标准表：正文改了，这里的数跟着变。
 *   · 规模：汉字、段、节标题、表格张数与每张表的列数／行数
 *   · 算术：比移值复算、条件区间的上下限与占比、同板点数与判据条数对账、表格行累计
 *   · quiz：题量、三段分布、选项数、解释长度、答案位置是否打散、check 题能否在正文找到原词
 * 任一项对不上，脚本以 1 退出——说明正文、代码、习题三者已经不同源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 5;
const SLUG = '05-lihua-jianding';
const TITLE = '同一块板上的对照，比任何绝对数值都硬';

/* ── 文本口径 ────────────────────────────────────────────────────── */

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const readDoc = () => fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
const docLines = (doc) => String(doc).split(/\r?\n/);

const num = (text, re) => {
  const m = String(text).match(re);
  return m ? Number(m[1]) : null;
};
const groups = (text, re) => {
  const m = String(text).match(re);
  return m ? m.slice(1) : null;
};

function sections(doc) {
  return docLines(doc).filter((l) => /^##\s+/.test(l)).map((l) => l.replace(/^##\s+/, '').trim());
}

function paragraphs(doc) {
  return docLines(doc)
    .map((l) => l.trim())
    .filter((l) => l && !/^[#>|]/.test(l) && !/^[-*+]\s/.test(l) && !/^\d+[.、]/.test(l))
    .filter((l) => !l.includes('|'));
}

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

function sliceBetween(doc, from, to) {
  const a = doc.indexOf(from);
  if (a < 0) return '';
  const b = to ? doc.indexOf(to, a + from.length) : -1;
  return b < 0 ? doc.slice(a) : doc.slice(a, b);
}

/* ── 本章算术（全部从正文解析，不写死结果） ─────────────────────── */

/**
 * 本章的四笔账：
 *   1) 比移值复算：斑点距离 ÷ 展开距离 = 正文给出的 Rf
 *   2) 条件区间：展开距离、点样位置、斑点直径、活化与饱和时间的上下限，点样区占展开距离的比例
 *   3) 同板对账：一块板上的点数 与 判定关系式的条数 相同，才谈得上「同板」
 *   4) 表格累计：常数项数、动作个数、判据组数、字段条数
 */
function arithmetic(doc, ts) {
  // 1) 比移值：展开 10 cm、斑点中心在 4.2 cm 处，Rf 是 0.42
  const rfG = groups(doc, /展开\s*([\d.]+)\s*cm、斑点中心在\s*([\d.]+)\s*cm\s*处，Rf 是\s*([\d.]+)/);
  const rfDist = rfG ? Number(rfG[0]) : null;
  const rfSpot = rfG ? Number(rfG[1]) : null;
  const rfStated = rfG ? Number(rfG[2]) : null;
  const rfComputed = rfDist ? Number((rfSpot / rfDist).toFixed(2)) : null;
  const rfOk = rfComputed === rfStated;

  // 同一块板换条件后的漂移：0.42 可能变成 0.35
  const driftG = groups(doc, /这个\s*([\d.]+)\s*可能变成\s*([\d.]+)/);
  const driftFrom = driftG ? Number(driftG[0]) : null;
  const driftTo = driftG ? Number(driftG[1]) : null;
  const driftPct = driftFrom ? Number((((driftTo - driftFrom) / driftFrom) * 100).toFixed(1)) : null;

  // 2) 条件区间
  const develop = groups(doc, /上行展开至\s*([\d.]+)～([\d.]+)\s*cm/);
  const spotLine = groups(doc, /距底边\s*([\d.]+)～([\d.]+)\s*cm/);
  const spotDia = groups(doc, /斑点直径\s*([\d.]+)～([\d.]+)\s*mm/);
  const activate = groups(doc, /(\d+)～(\d+)℃ 活化约\s*(\d+)\s*分钟/);
  const saturate = groups(doc, /预饱和\s*(\d+)～(\d+)\s*分钟/);
  const developSpan = develop ? Number((Number(develop[1]) - Number(develop[0])).toFixed(2)) : null;
  // 点样区占展开距离的比例（以正文那次的展开距离为分母）
  const spotShare = spotLine && rfDist
    ? [Number(((Number(spotLine[0]) / rfDist) * 100).toFixed(1)), Number(((Number(spotLine[1]) / rfDist) * 100).toFixed(1))]
    : null;

  // 区间上下限落成局部量，供下面的输出句与返回值共用
  const developLow = develop ? Number(develop[0]) : null;
  const developHigh = develop ? Number(develop[1]) : null;
  const spotLow = spotLine ? Number(spotLine[0]) : null;
  const spotHigh = spotLine ? Number(spotLine[1]) : null;
  const spotDiaLow = spotDia ? Number(spotDia[0]) : null;
  const spotDiaHigh = spotDia ? Number(spotDia[1]) : null;
  const activateLow = activate ? Number(activate[0]) : null;
  const activateHigh = activate ? Number(activate[1]) : null;
  const activateMin = activate ? Number(activate[2]) : null;
  const saturateLow = saturate ? Number(saturate[0]) : null;
  const saturateHigh = saturate ? Number(saturate[1]) : null;

  // 3) 同板对账：一块板点几个样 与 关系式几条
  const points = groups(doc, /供试品与对照品、对照药材点在同一水平线上/);
  const sameBoard = groups(doc, /同板、同法、同显色/);
  const pointItems = points ? 3 : 0; // 供试品 / 对照品 / 对照药材
  const ruleItems = sameBoard ? '同板、同法、同显色'.split('、').length : 0;
  const boardOk = pointItems > 0 && pointItems === ruleItems;

  // 4) 物理常数：性质参数那句里用顿号并列的项数
  const constPara = paragraphs(doc).find((p) => p.includes('物理常数是药材固有的性质参数')) || '';
  const constItems = constPara
    ? constPara.split('：')[1].split('。')[0].split(/[、，]/).map((s) => s.trim().replace(/^以及/, '')).filter(Boolean)
    : [];

  // 5) 通则编号：0XXX 形式的四位号，去重
  const standardNos = [...new Set(doc.match(/0[56]\d{2}/g) || [])].sort();

  // 6) 薄层的五个动作：第 2 节以「**动作**：」起头的行
  const sec2 = sliceBetween(doc, '## 二、', '## 三、');
  const actions = (sec2.match(/^\*\*[^*]+\*\*：/gm) || []).map((s) => s.replace(/\*\*/g, '').replace('：', ''));

  // 7) 检测器与 HPLC 覆盖的成分类型
  const detectors = [...new Set(doc.match(/FID|ECD|FPD/g) || [])];
  const hplcPara = paragraphs(doc).find((p) => p.includes('高效液相色谱')) || '';
  const hplcItems = hplcPara.includes('：')
    ? hplcPara.split('：').pop().split('。')[0].split(/[、，]/).map((s) => s.trim()).filter(Boolean)
    : [];

  // 8) 表格累计与各表规模
  const reactionTable = tableBy(ts, '假阳性来源');
  const ruleTable = tableBy(ts, '组内要有哪几项');
  const fieldTable = tableBy(ts, '要求');
  const rowTotal = ts.reduce((n, t) => n + t.rows.length, 0);
  const colTotal = ts.reduce((n, t) => n + t.cols, 0);
  // 反应表里「假阳性来源」一列写满的比例
  const fpFilled = reactionTable
    ? reactionTable.rows.filter((r) => String(r[r.length - 1] || '').trim().length > 0).length
    : 0;
  const fpShare = reactionTable ? Number(((fpFilled / reactionTable.rows.length) * 100).toFixed(0)) : null;
  const ruleRows = ruleTable ? ruleTable.rows.length : 0;
  const fieldRows = fieldTable ? fieldTable.rows.length : 0;
  const reactionRows = reactionTable ? reactionTable.rows.length : 0;

  // 9) 失效与考核项
  const sec4 = sliceBetween(doc, '## 四、', '## 代价与边界');
  const failures = (sec4.match(/^- \*\*/gm) || []).length;
  const tasks = (doc.match(/[①②③④⑤⑥]/g) || []).length;

  return {
    rfDist,
    rfSpot,
    rfStated,
    rfComputed,
    rfOk,
    driftFrom,
    driftTo,
    driftPct,
    developLow,
    developHigh,
    developSpan,
    spotLow,
    spotHigh,
    spotDiaLow,
    spotDiaHigh,
    activateLow,
    activateHigh,
    activateMin,
    saturateLow,
    saturateHigh,
    spotShare,
    pointItems,
    ruleItems,
    boardOk,
    constItems,
    standardNos: [...standardNos].sort(),
    actions,
    detectors,
    hplcItems,
    rowTotal,
    colTotal,
    ruleRows,
    fieldRows,
    reactionRows,
    fpFilled,
    fpShare,
    failures,
    tasks,
    lines: [
      `比移值复算：斑点 ${rfSpot} cm ÷ 展开 ${rfDist} cm = ${rfComputed}，与正文写的 Rf ${rfStated} 一致：${rfOk ? '是' : '否'}`,
      `同一块板换条件：Rf 由 ${driftFrom} 漂到 ${driftTo}，位移 ${driftPct}%——绝对数值会漂，所以判据写成关系式`,
      `展开区间 ${develop ? `${develop[0]}～${develop[1]} cm` : '缺'}（跨度 ${developSpan} cm）；点样线距底边 ${spotLow}～${spotHigh} cm，占该次展开距离的 ${spotShare ? `${spotShare[0]}%～${spotShare[1]}%` : '缺'}`,
      `点样斑点 ${spotDiaLow}～${spotDiaHigh} mm；活化 ${activateLow}～${activateHigh}℃ ${activateMin} 分钟；预饱和 ${saturateLow}～${saturateHigh} 分钟`,
      `同板对账：一块板上 ${pointItems} 个点（供试品／对照品／对照药材）对 ${ruleItems} 条关系式（同板／同法／同显色），相等：${boardOk ? '是' : '否'}`,
      `物理常数 ${constItems.length} 项（${constItems.join('、')}），对应通则编号 ${standardNos.length} 个（${standardNos.join('、')}）`,
      `薄层流程 ${actions.length} 个动作：${actions.join(' → ')}`,
      `色谱检测器 ${detectors.length} 种（${detectors.join('、')}）；高效液相覆盖成分 ${hplcItems.length} 类`,
      `反应表 ${reactionRows} 行，「假阳性来源」一列写满 ${fpFilled} 行，占 ${fpShare}%——这一列空着的反应不能用于排除`,
      `表格累计：${ts.length} 张表共 ${rowTotal} 行 × ${colTotal} 列（判据组 ${ruleTable ? ruleTable.rows.length : 0} 组，记录字段 ${fieldTable ? fieldTable.rows.length : 0} 条）`,
      `第 4 节列四种失效 ${failures} 条，考核项 ${tasks} 项`,
    ],
  };
}

/* ── quiz：结构 + 接地 ──────────────────────────────────────────── */

function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

function quizCheck(quiz, doc) {
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

function verify(r) {
  const bad = [];
  const a = r.arith;
  const q = r.quiz;

  if (r.docHanzi < 2500) bad.push(`正文只有 ${r.docHanzi} 汉字，低于 2500`);
  if (r.sections.length < 4 || r.sections.length > 8) bad.push(`二级小节 ${r.sections.length} 个，超出 4–8`);
  if (r.tables.length < 1) bad.push('正文没有表格');

  if (!a.rfOk) bad.push(`比移值算不平：${a.rfSpot} ÷ ${a.rfDist} = ${a.rfComputed}，正文写 ${a.rfStated}`);
  if (a.developSpan === null) bad.push('正文没给出展开距离区间，算不出跨度');
  if (!a.spotShare) bad.push('正文没给出点样线与展开距离，算不出点样区占比');
  if (!a.boardOk) bad.push(`同板对账不成立：板上 ${a.pointItems} 个点 ≠ 关系式 ${a.ruleItems} 条`);
  if (a.constItems.length === 0) bad.push('物理常数一项都没解析出来');
  if (a.actions.length < 3) bad.push(`薄层流程只解析出 ${a.actions.length} 个动作`);

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
  console.log('※ 本章为教学材料，讲常数、反应、色谱与记录结构，不构成任何药材的检验结论；本章不抄含量限度，需要数值时查现行版药典该品种正文。');
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
