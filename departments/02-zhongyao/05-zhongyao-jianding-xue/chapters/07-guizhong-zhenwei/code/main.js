#!/usr/bin/env node
/**
 * 中药鉴定学 · 第 7 章 贵重药材的真伪，全押在几条能数出来的特征上
 *
 *   node code/main.js
 *
 * 正文：chapters/07-guizhong-zhenwei/docs/zh.md
 * 习题：chapters/07-guizhong-zhenwei/quiz.json
 * 依赖：仅 Node.js 标准库
 *
 * 只读本章正文与本章 quiz，不读任何标准表：正文改了，这里的数跟着变。
 *   · 规模：汉字、段、节标题、表格张数与每张表的列数／行数
 *   · 算术：掺伪增重的克数与占比复算、可数特征的对数与比例、区间跨度、
 *           逐件取样与按比例抽样的漏检对账、表格行列累计
 *   · quiz：题量、三段分布、选项数、解释长度、答案位置是否打散、check 题能否在正文找到原词
 * 任一项对不上，脚本以 1 退出——说明正文、代码、习题三者已经不同源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 7;
const SLUG = '07-guizhong-zhenwei';
const TITLE = '贵重药材的真伪，全押在几条能数出来的特征上';

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
const round = (x, d = 2) => Number(Number(x).toFixed(d));

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
const colIndex = (t, kw) => t.header.findIndex((h) => h.includes(kw));

function sliceBetween(doc, from, to) {
  const a = doc.indexOf(from);
  if (a < 0) return '';
  const b = to ? doc.indexOf(to, a + from.length) : -1;
  return b < 0 ? doc.slice(a) : doc.slice(a, b);
}

/* ── 本章算术（全部从正文解析，不写死结果） ─────────────────────── */

/**
 * 本章的四笔账：
 *   1) 掺伪增重：根数 × 每根克数 = 多出来的克数；多出来的克数 ÷ 整件克数 = 占比
 *   2) 可数特征：中部明显的对数 ÷ 总对数 = 明显比例；环纹、环带的区间跨度
 *   3) 取样对账：逐件取样时漏检为 0；按比例只取两件时，覆盖率与漏检件数各是多少
 *   4) 层级与步骤：判据三层、取样五步，与表格行列累计一起构成规模
 */
function arithmetic(doc, ts) {
  const ruleTable = tableBy(ts, '掺伪');
  const fieldTable = tableBy(ts, '要求');
  if (!ruleTable) throw new Error('正文缺「掺伪与伪品破口」判据表');

  // 1) 掺伪增重：100 g 里插 10 根、每根 0.2 g，多出 2 g，占 2%
  const wholeG = num(doc, /(\d+)\s*g\s*冬虫夏草/);
  const pinG = groups(doc, /插了\s*(\d+)\s*根铁丝、每根\s*([\d.]+)\s*g/);
  const pins = pinG ? Number(pinG[0]) : null;
  const perPin = pinG ? Number(pinG[1]) : null;
  const addedG = pins && perPin ? round(pins * perPin) : null;
  const statedG = num(doc, /多出来的就是\s*([\d.]+)\s*g/);
  const statedPct = num(doc, /占\s*([\d.]+)%/);
  const computedPct = wholeG && addedG ? round((addedG / wholeG) * 100, 1) : null;
  const weightOk = addedG === statedG;
  const pctOk = computedPct === statedPct;

  // 2) 可数特征：足 8 对、中部 4 对明显
  const footG = groups(doc, /足\s*(\d+)\s*对，中部\s*(\d+)\s*对明显/);
  const feet = footG ? Number(footG[0]) : null;
  const feetObvious = footG ? Number(footG[1]) : null;
  const feetShare = feet ? round((feetObvious / feet) * 100, 1) : null;

  // 环纹与环带的区间
  const rings = groups(doc, /环纹\s*(\d+)～(\d+)\s*个/);
  const bands = groups(doc, /尾有\s*(\d+)～(\d+)\s*个银灰环带/);
  const ringLow = rings ? Number(rings[0]) : null;
  const ringHigh = rings ? Number(rings[1]) : null;
  const ringSpan = rings ? ringHigh - ringLow : null;
  const bandLow = bands ? Number(bands[0]) : null;
  const bandHigh = bands ? Number(bands[1]) : null;
  const bandSpan = bands ? bandHigh - bandLow : null;

  // 3) 取样对账：逐件 vs 按比例
  const sampleG = groups(doc, /总件数\s*(\d+)\s*件只取\s*(\d+)\s*件/);
  const lots = sampleG ? Number(sampleG[0]) : null;
  const taken = sampleG ? Number(sampleG[1]) : null;
  const proportionalCover = lots && taken ? round((taken / lots) * 100, 1) : null;
  const proportionalMissed = lots && taken ? lots - taken : null;
  // 贵重药材的规矩：逐件取样，取样件数 = 总件数，漏检 0
  const piecewiseTaken = lots;
  const piecewiseMissed = lots ? lots - piecewiseTaken : null;
  const piecewiseCover = lots ? round((piecewiseTaken / lots) * 100, 1) : null;

  // 4) 判据三层、取样五步
  const sec1 = sliceBetween(doc, '## 一、', '## 二、');
  const tiers = (sec1.match(/^\d+\.\s+\*\*/gm) || []).length;
  const sec3 = sliceBetween(doc, '## 三、', '## 四、');
  const steps = (sec3.match(/^\d+\.\s+\*\*/gm) || []).length;

  // 5) 表格累计与列填充率
  const rowTotal = ts.reduce((n, t) => n + t.rows.length, 0);
  const colTotal = ts.reduce((n, t) => n + t.cols, 0);
  const failCol = colIndex(ruleTable, '不成立条件');
  const failFilled = ruleTable.rows.filter((r) => String(r[failCol] || '').trim().length > 0).length;
  const failShare = ruleTable.rows.length ? round((failFilled / ruleTable.rows.length) * 100, 0) : null;

  // 6) 失效与考核项
  const sec4 = sliceBetween(doc, '## 四、', '## 代价与边界');
  const failures = (sec4.match(/^- \*\*/gm) || []).length;
  const tasks = (doc.match(/[①②③④⑤⑥]/g) || []).length;

  return {
    wholeG,
    pins,
    perPin,
    addedG,
    statedG,
    statedPct,
    computedPct,
    weightOk,
    pctOk,
    feet,
    feetObvious,
    feetShare,
    ringLow,
    ringHigh,
    ringSpan,
    bandLow,
    bandHigh,
    bandSpan,
    lots,
    taken,
    proportionalCover,
    proportionalMissed,
    piecewiseTaken,
    piecewiseMissed,
    piecewiseCover,
    tiers,
    steps,
    rowTotal,
    colTotal,
    drugRows: ruleTable.rows.length,
    drugCols: ruleTable.cols,
    fieldRows: fieldTable ? fieldTable.rows.length : 0,
    failFilled,
    failShare,
    failures,
    tasks,
    lines: [
      `掺伪增重：（${pins} 根 × ${perPin} g）= ${addedG} g，与正文写的「多出来 ${statedG} g」一致：${weightOk ? '是' : '否'}`,
      `占比复算：${addedG} g ÷ ${wholeG} g = ${computedPct}%，与正文写的 ${statedPct}% 一致：${pctOk ? '是' : '否'}——重量对得上，虫体对不上`,
      `可数特征：足 ${feet} 对，中部明显 ${feetObvious} 对，占 ${feetShare}%；环纹 ${ringLow}～${ringHigh} 个（跨度 ${ringSpan}），蛤蚧尾银灰环带 ${bandLow}～${bandHigh} 个（跨度 ${bandSpan}）`,
      `判据层级 ${tiers} 层（可数形态 → 水火行为 → 理化数据），取样动作 ${steps} 步；顺序不可倒，无损优先`,
      `取样对账·按比例：总件数 ${lots} 件只取 ${taken} 件，覆盖 ${proportionalCover}%，漏检 ${proportionalMissed} 件`,
      `取样对账·贵重药材逐件：${piecewiseTaken} / ${lots} 件，覆盖 ${piecewiseCover}%，漏检 ${piecewiseMissed} 件——这一条是本章最硬的程序要求`,
      `判据表 ${ruleTable.rows.length} 味药 × ${ruleTable.cols} 列，「不成立条件」写满 ${failFilled} 行（${failShare}%）`,
      `表格累计：${ts.length} 张表共 ${rowTotal} 行 × ${colTotal} 列（记录字段 ${fieldTable ? fieldTable.rows.length : 0} 条）`,
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

  if (!a.weightOk) bad.push(`增重克数对不上：${a.pins} × ${a.perPin} = ${a.addedG} g，正文写 ${a.statedG} g`);
  if (!a.pctOk) bad.push(`增重占比对不上：算得 ${a.computedPct}%，正文写 ${a.statedPct}%`);
  if (a.feetShare === null) bad.push('正文没给出足的对数，算不出中部明显比例');
  if (a.proportionalCover === null) bad.push('正文没给出手写的那种「总件数只取几件」的组合，算不出覆盖率');
  if (a.piecewiseMissed !== 0) bad.push(`逐件取样的漏检件数应为 0，实为 ${a.piecewiseMissed}`);
  if (a.tiers < 2) bad.push(`判据层级只解析出 ${a.tiers} 层`);
  if (a.steps < 3) bad.push(`取样动作只解析出 ${a.steps} 步`);

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
  console.log('※ 本章为教学材料，讲判据结构、取样顺序与记录要求，不构成任何药材的真伪结论或价格判断；虎骨、犀角禁止贸易与药用，涉保护物种的须核查合法来源。');
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
  colIndex,
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
