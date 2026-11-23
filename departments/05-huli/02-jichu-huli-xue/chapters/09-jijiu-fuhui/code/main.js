#!/usr/bin/env node
/**
 * 基础护理学 · 第 9 章 · 复苏配合的关键是知道自己的位置，不是抢着做
 * 课程: departments/05-huli/02-jichu-huli-xue/chapters/09-jijiu-fuhui/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 统计只读 docs/zh.md 现算，不碰 units.json 一类的数据层（quiz.json 只用来核题目结构）：
 *   规模（汉字、实质段）、关键词命中与占比、表格结构、失效模式清单、
 *   quiz 的题目结构与接地情况，全部从正文本身数出来。
 * 计数口径照正文自己写的那一条：实质段＝以换行分隔、≥35 汉字者；
 * 占比＝命中段汉字／实质段汉字合计（分子是汉字，不是段数）。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '9';
const SLUG = '09-jijiu-fuhui';
const TITLE = '复苏配合的关键是知道自己的位置，不是抢着做';

/** 正文自定的口径：一段至少 35 个汉字才算实质段 */
const MIN_SEG = 35;
/** 判「接地」用的连续汉字长度 */
const GRAM = 4;

const KEYWORDS = ['分工', '记录', '交接'];

/** 本章模型表（第 1 张）：现场三件事的先后 */
const MODEL = { index: 0, col: 1, name: '现场三件事的先后' };
const PREP = { index: 1, col: 0, name: '平时准备与现场确认六项' };
const STEPS = { index: 2, col: 0, name: '五个位置' };
const LIMITS = { index: 3, col: 0, name: '时限与责任人' };
const LOG = { index: 4, col: 0, name: '记录七列' };

const readDoc = () => fs.readFileSync(DOC, 'utf8');

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

/** 正文的段落层：以换行分隔，去掉标题、表格行、引用块与分隔线 */
function paragraphs(text) {
  const out = [];
  for (const raw of String(text).replace(/\r\n/g, '\n').split('\n')) {
    const s = raw.trim();
    if (!s) continue;
    if (/^#{1,6}\s/.test(s)) continue;
    if (s.startsWith('|')) continue;
    if (s.startsWith('>')) continue;
    if (/^([-*]|\d+\.)\s+/.test(s)) {
      out.push(s.replace(/^([-*]|\d+\.)\s+/, ''));
      continue;
    }
    out.push(s);
  }
  return out;
}

/** 实质段：以换行分隔、≥35 汉字者 */
function substantive(text) {
  return paragraphs(text).filter((p) => hanzi(p) >= MIN_SEG);
}

/** 关键词命中：段数、命中段汉字、占实质段汉字的比例 */
function keywordHits(words, segs) {
  const list = segs || substantive(readDoc());
  const total = list.reduce((a, p) => a + hanzi(p), 0);
  return words.map((word) => {
    const hit = list.filter((p) => p.includes(word));
    const hitHanzi = hit.reduce((a, p) => a + hanzi(p), 0);
    return {
      word,
      segs: hit.length,
      segHanzi: hitHanzi,
      share: total ? (hitHanzi / total) * 100 : 0,
    };
  });
}

/** 连续以 | 开头的行成一张表；rows 去掉表头与分隔行 */
function tableBlocks(text) {
  const blocks = [];
  let cur = null;
  for (const line of String(text).replace(/\r\n/g, '\n').split('\n')) {
    const s = line.trim();
    if (s.startsWith('|')) {
      if (!cur) {
        cur = [];
        blocks.push(cur);
      }
      cur.push(s);
    } else cur = null;
  }
  return blocks.map((b) => {
    const cells = b.map((r) =>
      r
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.trim())
    );
    return { head: cells[0] || [], rows: cells.slice(2) };
  });
}

/** 第 i 张表的第 j 列（不含表头） */
function column(i, j = 0, text) {
  const b = tableBlocks(text || readDoc())[i];
  return b ? b.rows.map((r) => r[j]) : [];
}

/** 某个二级节（按「## 一、」这类标题切）的正文 */
function section(text, re) {
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex((l) => /^##\s+/.test(l) && re.test(l));
  if (start < 0) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^##\s+/.test(l));
  return (end < 0 ? rest : rest.slice(0, end)).join('\n');
}

/** 失效模式：第五节里以加粗词开头的条目 */
function failures() {
  const body = section(readDoc(), /五、失效模式/);
  return [...body.matchAll(/^-\s+\*\*(.+?)\*\*/gm)].map((m) => m[1].trim());
}

const occurrences = (text, term) => String(text).split(term).length - 1;

/** 正文里长度为 n 的连续汉字片段集合 */
function grams(text, n = GRAM) {
  const out = new Set();
  for (const seg of String(text).replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

function model() {
  return column(MODEL.index, MODEL.col || 0);
}

/** 平时准备与现场确认六项 */
function prep() {
  return column(PREP.index, PREP.col || 0);
}

/** 五个位置 */
function steps() {
  return column(STEPS.index, STEPS.col || 0);
}

/** 时限与责任人 */
function limits() {
  return column(LIMITS.index, LIMITS.col || 0);
}

/** 记录七列 */
function logCols() {
  return column(LOG.index, LOG.col || 0);
}

/** 本章自己的叫法：order、prepItems、positions、logColumns */
const order = () => model();
const prepItems = () => prep();
const positions = () => steps();
const logColumns = () => log();

/** quiz 的结构与接地：check 题正确选项能对上几个四字原词 */
function quizSummary(quiz, text) {
  const body = grams(text || readDoc());
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  for (const q of qs) if (stage[q.stage] !== undefined) stage[q.stage] += 1;
  const hits = qs
    .filter((q) => q.stage === 'check')
    .map((q) => {
      const right = String((q.options || [])[q.correct] || '');
      return { question: q.question, grams: [...grams(right)].filter((g) => body.has(g)) };
    });
  return {
    total: qs.length,
    stage,
    check: hits.length,
    grounded: hits.filter((h) => h.grams.length).length,
    rich: hits.filter((h) => new Set(h.grams).size >= 2).length,
    hits,
    spread: new Set(qs.map((q) => q.correct)).size,
  };
}

function analyze() {
  const text = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const segs = substantive(text);
  return {
    hanzi: hanzi(text),
    paragraphs: paragraphs(text).length,
    segs: segs.length,
    segHanzi: segs.reduce((a, p) => a + hanzi(p), 0),
    keywords: keywordHits(KEYWORDS, segs),
    tables: tableBlocks(text),
    model: model(),
    failures: failures(),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`基础护理学 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 段落 ${r.paragraphs} 个 · 实质段 ${r.segs} 段（≥${MIN_SEG} 汉字／${r.segHanzi.toLocaleString('en-US')} 字）`);
  console.log('');
  console.log('关键词命中（占比＝命中段汉字／实质段汉字合计）：');
  for (const k of r.keywords) {
    console.log(`  ${k.word}\t${k.segs} 段\t${k.share.toFixed(1)}%`);
  }
  console.log('');
  console.log(`表格 ${r.tables.length} 张：${r.tables.map((t) => `${t.rows.length} 行`).join(' · ')}`);
  console.log(`${MODEL.name}（${r.model.length} 项）：${r.model.join(' / ')}`);
  console.log(`${PREP.name}（${prep().length} 项）：${prep().join(' / ')}`);
  console.log(`${STEPS.name}（${steps().length} 个）：${steps().join(' / ')}`);
  console.log(`${LOG.name}（${logCols().length} 列）：${logCols().join(' / ')}`);
  console.log(`${LIMITS.name}（${limits().length} 项）：${limits().join(' / ')}`);

  console.log('');
  console.log(`失效模式（${r.failures.length} 条）：${r.failures.join(' / ')}`);
  console.log('');
  const q = r.quiz;
  console.log(
    `quiz ${q.total} 题（pre ${q.stage.pre} / check ${q.stage.check} / post ${q.stage.post}）· check 题接地 ${q.grounded} 道（带两个以上原文词组的 ${q.rich} 道）· 答案落在 ${q.spread} 个位置`
  );
  console.log('');
  console.log('※ 以上规模、命中、结构与接地情况全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成医学意见、诊断或护理指导；操作与判定要求以现行规范与所在机构制度为准。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  MIN_SEG,
  KEYWORDS,
  readDoc,
  hanzi,
  paragraphs,
  substantive,
  keywordHits,
  tableBlocks,
  column,
  section,
  failures,
  occurrences,
  grams,
  MODEL,
  PREP,
  STEPS,
  LIMITS,
  LOG,
  model,
  quizSummary,
  analyze,
  prep,
  steps,
  limits,
  logCols,
  order,
  prepItems,
  positions,
  logColumns,
};
