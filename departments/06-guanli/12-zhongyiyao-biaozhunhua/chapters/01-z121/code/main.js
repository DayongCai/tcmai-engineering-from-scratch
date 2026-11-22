#!/usr/bin/env node
/**
 * 中医药标准化 · 第 1 章 · 标准化的第一刀，切在名词上
 * 课程: departments/06-guanli/12-zhongyiyao-biaozhunhua/chapters/01-z121/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的结构与数字全部从正文现算：
 *   七个条目要素、四类歧义、三个定义检验、三张表，
 *   以及「十八万张 × 十二味 × 八秒」折成工时的那笔账。
 * 不写死常数：正文一改，重跑即可看出哪一行对不上，测试再把结论固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '1';
const SLUG = '01-z121';
const TITLE = '标准化的第一刀，切在名词上';

/** 一条能用的术语条目要写全的七项，正文第一节按序列出 */
const ENTRY_ITEMS = ['条目编号', '首选中文名', '对应外文名', '定义', '许用同义词', '禁用词', '上位概念'];

/** 四类歧义，正文第一张表的首列（表序即此序） */
const AMBIGUITY_TYPES = ['同形异义', '异形同义', '上下位混用', '粒度不一'];

/** 判一条定义合不合格的三个检验，正文第四节 */
const DEFINITION_TESTS = ['替换检验', '反例检验', '边界检验'];

/** 术语落成表结构的三张表，正文第三节 */
const THREE_TABLES = ['概念表', '同义词表', '映射表'];

/** 条目的三个来源，正文第六节 */
const SOURCES = ['古籍与经典', '现行教材', '真实病历'];

const NUM = '一二三四五六七八九十百千万两';
const LINES = /\r?\n/;

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const occurrences = (text, term) => String(text).split(term).length - 1;

const CN_DIGIT = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const CN_UNIT = { 十: 10, 百: 100, 千: 1000 };

function cnInt(s) {
  if (!s) return 0;
  if (new RegExp(`^[零一二三四五六七八九两]+$`).test(s)) {
    return Number([...s].map((c) => CN_DIGIT[c]).join(''));
  }
  let total = 0;
  let section = 0;
  let num = 0;
  for (const ch of s) {
    if (ch === '万') {
      section = (section + num) * 10000;
      total += section;
      section = 0;
      num = 0;
    } else if (CN_UNIT[ch]) {
      section += (num || 1) * CN_UNIT[ch];
      num = 0;
    } else if (CN_DIGIT[ch] !== undefined) {
      num = CN_DIGIT[ch];
    }
  }
  return total + section + num;
}

/** 中文数字（含「点」小数）→ 数值，如「十八万」→ 180000、「十三点八」→ 13.8 */
function cn2num(s) {
  const raw = String(s || '').trim();
  if (!raw) return NaN;
  const [intPart, decPart] = raw.split('点');
  const intVal = cnInt(intPart);
  if (decPart === undefined) return intVal;
  const dec = [...decPart].map((c) => CN_DIGIT[c]).join('');
  return Number(`${intVal}.${dec}`);
}

function h2Titles(text) {
  const out = [];
  for (const line of String(text).split(LINES)) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) out.push(m[1].trim());
  }
  return out;
}

function h2Sections(text) {
  const out = [];
  let cur = null;
  for (const line of String(text).split(LINES)) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) {
      cur = { title: m[1].trim(), body: [line] };
      out.push(cur);
    } else if (cur) cur.body.push(line);
  }
  return out.map((s) => ({ title: s.title, body: s.body.join('\n') }));
}

const sectionAt = (text, i) => h2Sections(text)[i] || { title: '', body: '' };

/** 表格：连续以 | 开头的行成块；head 为首行，rows 跳过表头与分隔行 */
function tableBlocks(text) {
  const blocks = [];
  let cur = null;
  for (const line of String(text).split(LINES)) {
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
    const cells = b.map((r) => r.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()));
    return { head: cells[0] || [], rows: cells.slice(2) };
  });
}

/** 正文里长度为 n 的连续汉字片段，用来判一道题是否接地 */
function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

const numFrom = (text, re) => {
  const m = re.exec(text);
  return m ? cn2num(m[1]) : NaN;
};

/** 第一节的七项：逐项在正文里找，缺哪项就少一项 */
function entryItems(text) {
  const body = sectionAt(text, 0).body;
  return ENTRY_ITEMS.map((t) => ({ t, ok: body.includes(t) }));
}

/** 四类歧义：正文第一张表，首列为类型、第三列为该在哪一层修 */
function ambiguities(text) {
  const t = tableBlocks(text)[0];
  if (!t) return [];
  return t.rows.map((r) => ({ type: r[0], fix: r[2] }));
}

/** 第一节之外的七项是否都写到了「禁用词最不能省」和循环定义禁令 */
const definitionRules = (text) => ({
  bannedWord: /最容易被省略、也最不能省的是「禁用词」/.test(text),
  noSelfRef: /定义里不许出现被定义词，也不许出现它的同义词/.test(text),
  genus: /属加种差，先归上位，再写差别/.test(text),
});

/**
 * 正文开头那笔账：年处方量 × 每张味数 × 每条核对秒数 → 工时 → 人年。
 * 四个输入全部从正文读取，不写常数。
 */
function intakeCost(text) {
  const rx = numFrom(text, new RegExp(`中药处方([${NUM}]+)张`));
  const per = numFrom(text, new RegExp(`每张([${NUM}]+)味药`));
  const sec = numFrom(text, new RegExp(`每条([${NUM}]+)秒`));
  const cap = numFrom(text, new RegExp(`每人每年([${NUM}]+)小时`));
  const details = rx * per;
  const hours = (details * sec) / 3600;
  const people = hours / cap;
  const stated = numFrom(text, new RegExp(`([${NUM}]+)条处方明细`));
  return { rx, per, sec, cap, details, hours, people, stated };
}

/** quiz 结构与接地：check 题正确选项能在正文里对上几个四字原词 */
function quizSummary(quiz, text) {
  const body = grams(text);
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
    hits,
    spread: new Set(qs.map((q) => q.correct)).size,
    minExplain: Math.min(...qs.map((q) => hanzi(q.explain))),
  };
}

function analyze() {
  const text = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    entries: entryItems(text),
    ambiguities: ambiguities(text),
    tests: DEFINITION_TESTS.map((t) => ({ t, n: occurrences(text, t) })),
    tables: THREE_TABLES.map((t) => ({ t, n: occurrences(text, t) })),
    sources: SOURCES.map((t) => ({ t, n: occurrences(text, t) })),
    rules: definitionRules(text),
    cost: intakeCost(text),
    sqlPk: /term_id\s+TEXT PRIMARY KEY/.test(text) && /label\s+TEXT NOT NULL/.test(text),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`中医药标准化 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`条目七项（第 1 节，缺一项就不是可判定的条目）：`);
  console.log('  ' + r.entries.map((e) => `${e.ok ? '✓' : '✗'} ${e.t}`).join(' · '));
  console.log(`  禁用词最不能省：${r.rules.bannedWord ? '已写' : '未写'} · 属加种差：${r.rules.genus ? '已写' : '未写'} · 禁止循环定义：${r.rules.noSelfRef ? '已写' : '未写'}`);
  console.log('');
  console.log(`四类歧义（第 2 节表序，${r.ambiguities.length} 类）：`);
  for (const a of r.ambiguities) console.log(`  ${a.type} → 修在：${a.fix}`);
  console.log('');
  console.log(`三个定义检验：${r.tests.map((x) => `${x.t}(${x.n})`).join(' · ')}`);
  console.log(`三张表：${r.tables.map((x) => `${x.t}(${x.n})`).join(' · ')}`);
  console.log(`三个来源：${r.sources.map((x) => `${x.t}(${x.n})`).join(' · ')}`);
  console.log(`主键用概念号、别名带类型：${r.sqlPk ? '表结构已体现' : '表结构缺失'}`);
  console.log('');
  const c = r.cost;
  console.log(`演算（四个输入均读自正文）：`);
  console.log(`  ${c.rx.toLocaleString('en-US')} 张/年 × ${c.per} 味 = ${c.details.toLocaleString('en-US')} 条明细/年（正文自述 ${Number.isNaN(c.stated) ? '—' : c.stated.toLocaleString('en-US')} 条）`);
  console.log(`  × ${c.sec} 秒 → ${c.hours.toLocaleString('en-US')} 小时/年；按每人每年 ${c.cap.toLocaleString('en-US')} 小时 → ${c.people.toFixed(1)} 人`);
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 答案落在 ${r.quiz.spread} 个位置 · 最短解释 ${r.quiz.minExplain} 汉字`
  );
  console.log('');
  console.log('※ 以上结构与数字全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为术语工程与词表设计的教学讨论，不构成诊疗、用药或标准符合性判定建议。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  hanzi,
  occurrences,
  cn2num,
  cnInt,
  h2Titles,
  h2Sections,
  sectionAt,
  tableBlocks,
  grams,
  entryItems,
  ambiguities,
  definitionRules,
  intakeCost,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  ENTRY_ITEMS,
  AMBIGUITY_TYPES,
  DEFINITION_TESTS,
  THREE_TABLES,
  SOURCES,
};
