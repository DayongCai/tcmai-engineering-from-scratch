#!/usr/bin/env node
/**
 * 中医心理学 · 第 1 章 · 中医心理学的第一道判断，是分清形与神各自的证据
 * 课程: departments/05-huli/06-zhongyi-xinli-xue/chapters/01-lilun-kuangjia/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 统计只读 docs/zh.md 现算：规模（汉字、实质段）、关键词命中与占比、表格结构与首列、
 * 失效模式清单，以及 quiz 的题目结构、接地情况与答案位置，全部从正文本身数出来。
 * 计数口径：实质段＝以换行分隔、≥35 汉字者；占比＝命中段汉字／实质段汉字合计。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '1';
const SLUG = '01-lilun-kuangjia';
const TITLE = '中医心理学的第一道判断，是分清形与神各自的证据';

/** 正文自定的口径：一段至少 35 个汉字才算实质段 */
const MIN_SEG = 35;
/** 判「接地」用的连续汉字长度 */
const GRAM = 4;

const KEYWORDS = ['形神', '复核', '失效'];

/** 本章两张表：形神采集项、四档证据形态 */
const FORM = { index: 0, name: '形神采集项' };
const GRADE = { index: 1, name: '四档证据形态' };

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
    if (/^-{3,}$/.test(s)) continue;
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
    return { word, segs: hit.length, segHanzi: hitHanzi, share: total ? (hitHanzi / total) * 100 : 0 };
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

/** 失效模式：第五节里以「其一」…「其四」开头的加粗条目 */
function failures(text) {
  const body = section(text || readDoc(), /五、/);
  return [...body.matchAll(/\*\*其[一二三四五六]，([^*]+?)\*\*/g)].map((m) => m[1].replace(/。$/, '').trim());
}

/** 正文里长度为 n 的连续汉字片段集合 */
function grams(text, n = GRAM) {
  const out = new Set();
  for (const seg of String(text).replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

const formItems = () => column(FORM.index, 1);
const grades = () => column(GRADE.index, 0);

/** quiz 的结构与接地：check 题正确选项能对上几个原文四字片段 */
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
    form: formItems(),
    grades: grades(),
    failures: failures(text),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`中医心理学 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 段落 ${r.paragraphs} 个 · 实质段 ${r.segs} 段（≥${MIN_SEG} 汉字／${r.segHanzi.toLocaleString('en-US')} 字）`);
  console.log('');
  console.log('关键词命中（占比＝命中段汉字／实质段汉字合计）：');
  for (const k of r.keywords) console.log(`  ${k.word}\t${k.segs} 段\t${k.share.toFixed(1)}%`);
  console.log('');
  console.log(`表格 ${r.tables.length} 张：${r.tables.map((t) => `${t.rows.length} 行`).join(' · ')}`);
  console.log(`${FORM.name}（${r.form.length} 项）：${r.form.join(' / ')}`);
  console.log(`${GRADE.name}（${r.grades.length} 档）：${r.grades.join(' / ')}`);
  console.log('');
  console.log(`失效模式（${r.failures.length} 条）：${r.failures.join(' / ')}`);
  console.log('');
  const q = r.quiz;
  console.log(
    `quiz ${q.total} 题（pre ${q.stage.pre} / check ${q.stage.check} / post ${q.stage.post}）· check 题接地 ${q.grounded} 道（带两个以上原文词组的 ${q.rich} 道）· 答案落在 ${q.spread} 个位置`
  );
  console.log('');
  console.log('※ 以上规模、命中、结构与接地情况全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成医学意见、心理诊断或治疗建议；分档与复评时点以现行规范与所在机构制度为准。');
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
  FORM,
  GRADE,
  readDoc,
  hanzi,
  paragraphs,
  substantive,
  keywordHits,
  tableBlocks,
  column,
  section,
  failures,
  grams,
  formItems,
  grades,
  quizSummary,
  analyze,
};
