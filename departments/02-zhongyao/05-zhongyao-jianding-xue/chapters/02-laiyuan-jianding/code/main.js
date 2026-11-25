#!/usr/bin/env node
/**
 * 中药鉴定学 · 第 2 章 学名错一个属，整批性状描述跟着作废：正文与习题自检
 *
 *   node code/main.js
 *
 * 正文：chapters/02-laiyuan-jianding/docs/zh.md
 * 习题：chapters/02-laiyuan-jianding/quiz.json
 * 依赖：仅 Node.js 标准库
 *
 * 只读本章正文与本章习题，不读任何外部取数表：正文改了，这里的数字跟着变。
 *   · 规模：汉字、段、二级与三级节、每张表的列数／数据行数
 *   · 本章算术：表行列累计；从正文枚举里数出「一药多基原」的组数与学名数、
 *     「多药同源」的植物数与药材数，再算一对多的比值；学名四段的切分；
 *     记录载体与必填项数
 *   · 习题：题量、三段分布、四选项、答案位置是否打散、接地题数、最短解释
 * 任一自检不过，退出码 1 —— 说明正文、代码、习题三者已经不同源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 2;
const SLUG = '02-laiyuan-jianding';
const TITLE = '学名错一个属，整批性状描述跟着作废';

/* ── 文本口径 ────────────────────────────────────────────────────── */

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const readDoc = () => fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
const docLines = (doc) => String(doc).split(/\r?\n/);
const num = (s) => Number(String(s).replace(/[,，\s]/g, ''));

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

/* ── 本章算术（全部从正文解析后计算） ───────────────────────────── */

/** 一药多基原：正文「教材举了六组：A（x、y、z）、B（…）…」的组数与学名数 */
function multiOrigin(doc) {
  const start = doc.indexOf('教材举了');
  const end = doc.indexOf('多基原意味着');
  if (start < 0 || end < 0 || end <= start) throw new Error('正文里找不到一药多基原的枚举段');
  const seg = doc.slice(start, end);
  const list = seg.slice(seg.indexOf('：') + 1);
  const groups = splitTop(list, '、')
    .map((g) => {
      const m = g.match(/^([\u4e00-\u9fff]{2,4})（([^）]+)）/);
      if (!m) return null;
      const members = splitTop(m[2], '、')
        .flatMap((x) => splitTop(x, '及'))
        .map((x) => x.replace(/等$/, '').trim())
        .filter(Boolean);
      return { name: m[1], members };
    })
    .filter(Boolean);
  const total = groups.reduce((a, g) => a + g.members.length, 0);
  const max = groups.reduce((a, g) => (g.members.length > a.members.length ? g : a), groups[0]);
  return { groups, total, mean: total / groups.length, max };
}

/** 多药同源：正文「莲的…作A、…作B…；桑的…分别作C、D…」 */
function multiSource(doc) {
  const para = (doc.match(/^另一个是\*\*多药同源\*\*.*$/m) || [])[0];
  if (!para) throw new Error('正文里找不到多药同源的段落');
  const per = splitTop(para, '；').map((seg) => {
    const plant = (seg.match(/(?:^|：)([\u4e00-\u9fff])的/) || [])[1];
    const bang = (seg.match(/分别作([^。]+)/) || [])[1];
    const made = bang
      ? splitTop(bang, '、')
      : [...seg.matchAll(/作([\u4e00-\u9fff]{1,4})(?=[、；。]|$)/g)].map((m) => m[1]);
    return { plant, made };
  }).filter((x) => x.plant && x.made.length);
  return { plants: per, total: per.reduce((a, p) => a + p.made.length, 0) };
}

function arithmetic(doc, ts) {
  /* 表行列累计 */
  const tableRows = ts.reduce((a, t) => a + t.rows.length, 0);
  const tableCells = ts.reduce((a, t) => a + t.cols * t.rows.length, 0);

  /* 一药多基原 / 多药同源 两个方向 */
  const mo = multiOrigin(doc);
  const ms = multiSource(doc);
  const perName = mo.total / mo.groups.length;
  const perSource = ms.total / ms.plants.length;

  /* 学名四段：属名、种加词、原始命名人、重组者 */
  const nameMatch = doc.match(/([A-Z][a-z]+)\s+([a-z]{3,})\s+\(([A-Z][a-z]+\.)\)\s+([A-Z][a-z]+)/);
  const name = nameMatch
    ? { genus: nameMatch[1], epithet: nameMatch[2], author: nameMatch[3], combiner: nameMatch[4] }
    : null;
  const binomials = [...doc.matchAll(/\b([A-Z][a-z]{2,})\s+([a-z]{3,})\b/g)].map((m) => m[0]);
  const rankSigns = ['var.', 'subsp.', 'f.'].filter((s) => doc.includes(s));

  /* 采集与照片：一式几份、几张 */
  const copies = cn2n((doc.match(/一式([一二三四五六七八九十两])份/) || [])[1]);
  const photoSeg = (doc.match(/须在新鲜时当场记录并拍照：([^。]+)/) || [])[1] || '';
  const photos = splitTop(photoSeg).length;

  /* 命名法规的三条原则 */
  const rulesSeg = (doc.match(/命名法规的三条原则\*\*要能说出来：([^。]+)/) || [])[1] || '';
  const rules = splitTop(rulesSeg).map((x) => x.replace(/（[^）]*）/g, '').trim());

  /* 判据组：每组项数（用「→」层级兜底「A→B→C」写法） */
  const groupTable = tableBy(ts, '判据组');
  if (!groupTable) throw new Error('正文里找不到成组判据表');
  const groups = groupTable.rows.map((r) => {
    const listed = splitTop(r[1]).length;
    const arrow = (r[1].match(/→/g) || []).length;
    return { name: r[0], items: Math.max(listed, arrow ? arrow + 1 : 0) };
  });
  const groupItems = groups.reduce((a, g) => a + g.items, 0);

  /* 记录载体与必填项 */
  const recTable = tableBy(ts, '记录载体');
  if (!recTable) throw new Error('正文里找不到记录字段表');
  const carriers = recTable.rows.map((r) => ({ name: r[0], fields: splitTop(r[1]).length }));
  const fieldTotal = carriers.reduce((a, c) => a + c.fields, 0);

  /* 考核项：①②③④ */
  const taskPara = (doc.match(/\*\*考核项（本章）\*\*：(.+)$/m) || [])[1] || '';
  const tasks = (taskPara.match(/[①②③④⑤⑥]/g) || []).length;

  return {
    tableRows,
    tableCells,
    groups: mo.groups.map((g) => ({ name: g.name, members: g.members })),
    groupCount: mo.groups.length,
    nameCount: mo.total,
    meanPerName: mo.mean,
    maxGroup: { name: mo.max.name, members: mo.max.members.length },
    plants: ms.plants.map((p) => ({ plant: p.plant, made: p.made.length })),
    plantCount: ms.plants.length,
    drugCount: ms.total,
    meanPerSource: perSource,
    name,
    binomials: binomials.length,
    rankSigns,
    copies,
    photos,
    rules,
    criterionGroups: groups,
    criterionItems: groupItems,
    carriers,
    fieldTotal,
    fieldMean: fieldTotal / carriers.length,
    tasks,
    lines: [
      `表行列累计：${ts.length} 张表 · ${tableRows} 数据行 · ${tableCells} 个单元格`,
      `一药多基原：${mo.groups.length} 个中文名 → ${mo.total} 个学名（${mo.groups.map((g) => g.name + g.members.length).join(' / ')}），均 ${mo.mean.toFixed(1)} 个/名`,
      `  学名最多的一个：${mo.max.name} ${mo.max.members.length} 个`,
      `多药同源：${ms.plants.length} 种植物 → ${ms.total} 味药（${ms.plants.map((p) => p.plant + p.made.length).join(' / ')}），均 ${perSource.toFixed(1)} 味/学名`,
      `两个方向合计：${mo.total} 个学名 ÷ ${mo.groups.length} 个中文名 = ${perName.toFixed(1)}；${ms.total} 味药 ÷ ${ms.plants.length} 个学名 = ${perSource.toFixed(1)} —— 中文名不承担唯一性`,
      name
        ? `学名四段：属名 ${name.genus} + 种加词 ${name.epithet} + 原始命名人 ${name.author} + 重组者 ${name.combiner}；正文出现双名 ${binomials.length} 处，种下等级符号 ${rankSigns.length} 种（${rankSigns.join(' ')}）`
        : `正文出现双名 ${binomials.length} 处，种下等级符号 ${rankSigns.length} 种`,
      `采集：一式 ${copies} 份；新鲜期至少 ${photos} 张照片（${photoSeg}）`,
      `命名法规：${rules.length} 条原则（${rules.join('／')}）`,
      `成组判据：${groups.length} 组 ${groupItems} 项（${groups.map((g) => g.name + g.items).join(' / ')}）`,
      `记录：${carriers.length} 类载体 ${fieldTotal} 项必填（${carriers.map((c) => c.name + c.fields).join(' / ')}），均 ${(fieldTotal / carriers.length).toFixed(1)} 项/类`,
      `考核项 ${tasks} 条`,
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
  if (!r.arith.name) fails.push('正文里找不到可切分的完整学名');
  if (!r.arith.nameCount) fails.push('正文里数不出一药多基原的学名');
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
    console.log('自检：通过（题量与三段齐、四选项、答案打散、接地 ≥2、解释 ≥30 汉字、学名可切分）');
  }
  console.log('※ 以上数字由本章正文与习题现算，改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，判据与分档均为课堂约定，不构成鉴定结论或用药建议。');
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
  multiOrigin,
  multiSource,
  grams,
  hanzi,
  cn2n,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
