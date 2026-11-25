#!/usr/bin/env node
/**
 * 中药资源学 · 第 5 章 开发不是把药材换成产品，而是把年允收量换算成产品线的上限
 * 课程: departments/02-zhongyao/04-zhongyao-ziyuan-xue/chapters/05-kaifa-liyong/docs/zh.md
 * 数据: 只读本章正文 docs/zh.md 与 quiz.json（不读缓存、不读底本、不手打数字）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么只读正文现算：本章引用的每一个规模数（字数、节数、表行数、数字列合计、引文条数）
 * 都写在正文里，正文就是本章唯一的数据源。把统计写成对正文的复算，正文一改、数字就变，
 * 单测立刻报警；手打一份统计表则会在改稿后静默过期。
 *
 * 同时自检 quiz.json：题量、三段、四选项、解释长度，以及 check 题的正确选项能否在
 * 正文里找到原词——习题必须与正文同源，判据不能在正文里凭空长出来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 5;
const SLUG = '05-kaifa-liyong';
const TITLE = '开发不是把药材换成产品，而是把年允收量换算成产品线的上限';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

const readDoc = () => fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

/** H1 与二、三级小节：节数是审计判据之一（要求 4–8 个二级节） */
function headings(text) {
  const lines = text.split('\n');
  const h1 = (lines.find((l) => /^#\s+/.test(l)) || '').replace(/^#\s+/, '').trim();
  const h2 = [];
  const h3 = [];
  for (const l of lines) {
    if (/^##\s+/.test(l)) h2.push(l.replace(/^##\s+/, '').trim());
    else if (/^###\s+/.test(l)) h3.push(l.replace(/^###\s+/, '').trim());
  }
  return { h1, h2, h3 };
}

/** 正文里的全部表格：首行是表头，分隔行丢掉，其余是数据行 */
function tables(text) {
  const blocks = [];
  let cur = [];
  for (const raw of text.split('\n')) {
    if (/^\|.*\|$/.test(raw.trim())) cur.push(raw.trim());
    else {
      if (cur.length >= 2) blocks.push(cur);
      cur = [];
    }
  }
  if (cur.length >= 2) blocks.push(cur);
  const cells = (l) => l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  const isSep = (row) => row.every((c) => /^:?-{2,}:?$/.test(c.replace(/\s/g, '')));
  return blocks.map((b, i) => ({
    idx: i + 1,
    header: cells(b[0]),
    rows: b.slice(1).map(cells).filter((r) => !isSep(r)),
  }));
}

const num = (c) => {
  const v = String(c).replace(/[*_`\s,]/g, '');
  return /^-?\d+(?:\.\d+)?$/.test(v) ? Number(v) : null;
};

const isTotalRow = (r) => /^(合计|总计)/.test(String(r[0] || '').replace(/[*_\s]/g, ''));

/**
 * 可合计的计数列：排除比率列（每/平均/÷/占/率），
 * 若表里有「合计」行，则把数据行之和与该行对账——表内自洽也当场核。
 */
function columnStats(t) {
  const totalIdx = t.rows.findIndex(isTotalRow);
  const dataRows = t.rows.filter((_, i) => i !== totalIdx);
  const cols = [];
  t.header.forEach((name, ci) => {
    if (/每|平均|÷|占|率/.test(name)) return;
    const vals = dataRows.map((r) => num(r[ci]));
    if (!dataRows.length || vals.some((v) => v === null)) return;
    const sum = Number(vals.reduce((a, b) => a + b, 0).toFixed(4));
    const declared = totalIdx >= 0 ? num(t.rows[totalIdx][ci]) : null;
    cols.push({ name, sum, declared, ok: declared === null ? null : declared === sum });
  });
  return { totalIdx, cols };
}

/** 「」引文：全部条数 */
function quotes(text) {
  return [...text.matchAll(/「([^」]+)」/g)].map((m) => m[1]);
}

/** 教材定位点：教材·第N章·N.M.K（去重后排序） */
function locators(text) {
  const set = new Set();
  for (const m of text.matchAll(/教材·第(\d+)章·(\d+(?:\.\d+)*)/g)) set.add(`${Number(m[1])}|${m[2]}`);
  return [...set].sort((a, b) => {
    const [ca, sa] = a.split('|');
    const [cb, sb] = b.split('|');
    return Number(ca) - Number(cb) || sa.localeCompare(sb, 'en', { numeric: true });
  });
}

/** MOTTO 里的《书名·篇名》 */
function bookCites(text) {
  const line = text.split('\n').find((l) => /\*\*MOTTO:\*\*/.test(l)) || '';
  return [...line.matchAll(/《([^》]+)》/g)].map((m) => m[1]);
}

/** 正文段落数：排除标题、表格、引用块与代码块行 */
function proseBlocks(text) {
  return text
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !/^(#|>|\||```)/.test(s));
}

/** 正文里 4 字以上的连续汉字片段，用来判「选项是否接地」 */
function shingles(text, n = 4) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}


/** 三类产品表行数、三条深度开发路线、四层开发链条 */
function model(text = readDoc()) {
  const ts = tables(text);
  const products = ts[0] ? ts[0].rows.length : 0;
  const routes = text.includes('经典名方开发、老药新用、剂型改进') ? 3 : 0;
  const raw = (text.match(/「药材—饮片—提取物—新药及健康产品」/) || [])[0];
  const chain = raw ? raw.replace(/[「」]/g, '').split('—').length : 0;
  return { products, routes, chain };
}

function analyze(text = readDoc()) {
  const h = headings(text);
  const ts = tables(text);
  return {
    hanzi: (text.match(CJK) || []).length,
    h1: h.h1,
    h2: h.h2,
    h3: h.h3,
    paragraphs: proseBlocks(text).length,
    tables: ts.map((t) => {
      const st = columnStats(t);
      return {
        idx: t.idx,
        cols: t.header.length,
        rows: t.rows.length,
        dataRows: st.totalIdx >= 0 ? t.rows.length - 1 : t.rows.length,
        hasTotal: st.totalIdx >= 0,
        header: t.header,
        numeric: st.cols,
      };
    }),
    quotes: quotes(text).length,
    locators: locators(text),
    books: bookCites(text),
    body: shingles(text),
  };
}

/** 习题自检：结构、解释长度、以及 check 题正确选项的正文接地 */
function quizStats(quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8')), body = analyze().body) {
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stages = { pre: 0, check: 0, post: 0 };
  for (const q of qs) stages[q.stage] = (stages[q.stage] || 0) + 1;
  const hz = (s) => (String(s || '').match(CJK) || []).length;
  const grounded = qs.filter((q) => {
    if (q.stage !== 'check') return false;
    const right = String((q.options || [])[q.correct] || '');
    return [...shingles(right, 4)].some((g) => body.has(g));
  }).length;
  const problems = [];
  if (qs.length < 5) problems.push(`只有 ${qs.length} 题（需 ≥5）`);
  for (const s of ['pre', 'check', 'post']) if (!stages[s]) problems.push(`缺 ${s} 段`);
  for (const q of qs) {
    if (!Array.isArray(q.options) || q.options.length !== 4) problems.push(`非 4 选项：${q.question}`);
    if (!(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4)) problems.push(`correct 下标非法：${q.question}`);
    if (hz(q.explain) < 30) problems.push(`explain 过短（${hz(q.explain)} 汉字）：${q.question}`);
  }
  if (grounded < 2) problems.push(`接地 check 题只有 ${grounded} 道（需 ≥2）`);
  return {
    n: qs.length,
    stages,
    grounded,
    checks: stages.check,
    minExplain: qs.length ? Math.min(...qs.map((q) => hz(q.explain))) : 0,
    spread: new Set(qs.map((q) => q.correct)).size,
    problems,
  };
}

/** 本章自检：任何一条不符即抛错——宁可让脚本崩，也不让一个错的报告被打印出去 */
function selfCheck(a = analyze(), q = quizStats(undefined, a.body)) {
  const errs = [];
  if (!new RegExp(`^第\\s*${CHAPTER}\\s*章`).test(a.h1)) errs.push(`H1 章号不是 ${CHAPTER}：${a.h1}`);
  if (a.hanzi < 2500) errs.push(`汉字 ${a.hanzi} < 2500`);
  if (a.h2.length < 4 || a.h2.length > 8) errs.push(`二级小节 ${a.h2.length} 个，不在 4–8`);
  if (!a.h2.some((t) => /代价与边界/.test(t))) errs.push('缺「代价与边界」小节');
  if (!a.books.length) errs.push('MOTTO 缺《书名·篇名》');
  if (a.quotes < 5) errs.push(`「」引文只有 ${a.quotes} 条`);
  for (const t of a.tables) {
    if (t.cols < 2) errs.push(`表 ${t.idx} 只有 ${t.cols} 列`);
    if (t.dataRows < 1) errs.push(`表 ${t.idx} 没有数据行`);
    for (const c of t.numeric) {
      if (c.ok === false) errs.push(`表 ${t.idx} 的「${c.name}」：数据行合计 ${c.sum} ≠ 合计行 ${c.declared}`);
    }
  }
  for (const p of q.problems) errs.push(`quiz：${p}`);
  if (errs.length) throw new Error('本章自检失败：\n  ' + errs.join('\n  '));
  return true;
}

function main() {
  const a = analyze();
  const m = model();
  const q = quizStats(undefined, a.body);
  selfCheck(a, q);

  console.log(`═══ 第 ${CHAPTER} 章 ${TITLE} ═══`);
  console.log(`正文 ${a.hanzi} 汉字 · ${a.paragraphs} 个正文段 · ${a.tables.length} 张表 · 二级节 ${a.h2.length} · 三级节 ${a.h3.length}`);
  console.log('H1: ' + a.h1);
  console.log('MOTTO 书证: ' + a.books.map((b) => `《${b}》`).join(' · '));

  console.log('\n二级节（审计要求 4–8）:');
  a.h2.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));

  console.log('\n表格：');
  for (const t of a.tables) {
    const sums = t.numeric.length
      ? t.numeric.map((c) => `${c.name}=${c.sum}${c.ok === null ? '' : c.ok ? '（=合计行）' : `（≠合计行 ${c.declared}）`}`).join(' · ')
      : '无可合计的计数列';
    console.log(`  T${t.idx} ${t.cols} 列 × ${t.rows} 行${t.hasTotal ? '（含合计行）' : ''} | ${t.header.join(' | ')}`);
    console.log(`       数字列：${sums}`);
  }

  console.log('\n本章判据计数（全部由正文现算）：');
  console.log('  ' + JSON.stringify(m));
  if (m.units && Array.isArray(m.units.list)) {
    console.log('\n单元层（教材章 · 小节 · 字数 · 定位点，正文第六节声明的规模数由此现算）:');
    for (const u of m.units.list) console.log(`  ${u.chapter} · ${u.sub} ${u.title} · ${u.hanzi} 汉字 · ${u.locator}`);
  }

  console.log(`\n引文：「」${a.quotes} 条 · 教材定位点 ${a.locators.length} 个`);
  console.log(`习题 ${q.n} 题 (pre ${q.stages.pre}/check ${q.stages.check}/post ${q.stages.post}) · 最短解释 ${q.minExplain} 汉字 · 接地 check 题 ${q.grounded}/${q.checks} · 答案分布 ${q.spread} 种`);

  console.log('\n对账：节数、表行数、数字列合计、判据计数、习题接地全部由正文现算；正文一改，这里就变。');
  console.log('教学边界：本章统计只读本章正文、quiz.json 与正文声明的单元层，数字现算，用于中药资源学的结构核对与习题自检；不含种植规划、采挖限额与质量认定建议，不构成资源管理或产业投资决策依据。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER, SLUG, TITLE, DOC, QUIZ,
  readDoc, headings, tables, quotes, locators, bookCites, proseBlocks, shingles,
  analyze, model, quizStats, selfCheck, main,
};
