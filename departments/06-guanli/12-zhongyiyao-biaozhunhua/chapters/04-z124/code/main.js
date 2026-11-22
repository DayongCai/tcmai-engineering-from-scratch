#!/usr/bin/env node
/**
 * 中医药标准化 · 第 4 章 · 标准能不能用，看它能否被一条检测记录复现
 * 课程: departments/06-guanli/12-zhongyiyao-biaozhunhua/chapters/04-z124/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的结构与数字全部从正文现算：
 *   一条条款的四个字段、五段结构、七项检验项、七个数据元属性，
 *   以及「四百品种 × 十二个数据元 × 四批次」的数据点规模。
 * 不写死常数：正文一改，重跑即可看出哪一行对不上，测试再把结论固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '4';
const SLUG = '04-z124';
const TITLE = '标准能不能用，看它能否被一条检测记录复现';

/** 一条质量条款的四个字段，正文第一节 */
const CLAUSE_FIELDS = ['检验项目', '试验方法', '限度', '单位'];

/** 五段结构，正文第一张表首列 */
const EXPECTED_SEGMENTS = ['来源', '性状', '鉴别', '检查', '测定'];

/** 七个数据元属性，正文第二张表首列 */
const DATA_ELEMENT_ATTRS = ['名称', '定义', '数据类型', '表示格式', '值域', '计量单位', '方法依据'];

/** 正文说一个饮片品种标准通常列几类检验项，正文首段，逐项数出来 */
const INSPECTION_ITEMS = ['来源', '性状', '鉴别', '检查', '浸出物', '含量测定', '炮制'];

/** 每节一个探针词：第 i 个必须出现在第 i 节 */
const SECTION_PROBES = [
  '检验项目、试验方法、限度、单位',
  '五段是有顺序的',
  '指标成分不是有效成分',
  '不能作为合格判据',
  '炮制减毒',
  '元数据还要多记三样',
  '限度收紧有真实代价',
];

const NUM = '一二三四五六七八九十百千万两';
const LINES = /\r?\n/;

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const occurrences = (text, term) => String(text).split(term).length - 1;

const CN_DIGIT = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const CN_UNIT = { 十: 10, 百: 100, 千: 1000 };

function cnInt(s) {
  if (!s) return 0;
  if (/^[零一二三四五六七八九两]+$/.test(s)) {
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

/** 五段结构：第一张表的段名、内容、解决什么、主要弱点 */
function segments(text) {
  const t = tableBlocks(text)[0];
  if (!t) return [];
  return t.rows.map((r) => ({ name: r[0], content: r[1], solves: r[2], weakness: r[3] }));
}

/** 七个数据元属性：第二张表的属性与「缺了会怎样」 */
function dataElementAttrs(text) {
  const t = tableBlocks(text)[1];
  if (!t) return [];
  return t.rows.map((r) => ({ attr: r[0], example: r[1], damage: r[2] }));
}

/** 首段说的七类检验项：逐项在正文里找，返回命中数 */
function inspectionItems(text) {
  return INSPECTION_ITEMS.map((t) => ({ t, ok: text.includes(t) }));
}

/**
 * 数据点规模：品种数 × 每品种每批数据元数 → 一轮验收点数；再乘年批次。
 * 三个输入全部从正文读取。
 */
function dataVolume(text) {
  const varieties = numFrom(text, new RegExp(`常用([${NUM}]+)个品种`));
  const perVariety = numFrom(text, new RegExp(`按([${NUM}]+)个数据元记`));
  const rounds = numFrom(text, new RegExp(`一年按([${NUM}]+)个批次计`));
  const perRound = varieties * perVariety;
  const perYear = perRound * rounds;
  return { varieties, perVariety, rounds, perRound, perYear };
}

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
    fields: CLAUSE_FIELDS.map((f) => ({ f, n: occurrences(text, f) })),
    segments: segments(text),
    attrs: dataElementAttrs(text),
    inspections: inspectionItems(text),
    volume: dataVolume(text),
    limits: {
      consistent: /一致性与安全性的门槛/.test(text),
      notEfficacy: /把「符合标准」当成「临床有效」/.test(text),
      daodi: /道地性.*不可直接测量/s.test(text),
    },
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).body.includes(p) })),
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
  console.log(`一条条款的四个字段：${r.fields.map((x) => `${x.f}(${x.n})`).join(' · ')}`);
  console.log('');
  console.log(`五段结构（正文表序，${r.segments.length} 段）：`);
  for (const s of r.segments) console.log(`  ${s.name}｜内容：${s.content}｜解决：${s.solves}｜弱点：${s.weakness}`);
  console.log('');
  console.log(`七类检验项（首段逐项数）：${r.inspections.filter((x) => x.ok).length}/${r.inspections.length} 命中`);
  console.log('  ' + r.inspections.map((x) => `${x.ok ? '✓' : '✗'} ${x.t}`).join(' · '));
  console.log('');
  console.log(`数据元属性（正文表序，${r.attrs.length} 项）：`);
  for (const a of r.attrs) console.log(`  ${a.attr}｜示例：${a.example}｜缺了：${a.damage}`);
  console.log('');
  const v = r.volume;
  console.log('演算（三个输入均读自正文）：');
  console.log(`  ${v.varieties} 品种 × ${v.perVariety} 个数据元 = ${v.perRound.toLocaleString('en-US')} 个数据点/轮`);
  console.log(`  × 每年 ${v.rounds} 批次 = ${v.perYear.toLocaleString('en-US')} 个数据点/年`);
  console.log('');
  console.log(`定位：一致性与安全性的门槛 ${r.limits.consistent ? '已写' : '未写'} · 不等于临床有效 ${r.limits.notEfficacy ? '已写' : '未写'} · 道地性不可测量 ${r.limits.daodi ? '已写' : '未写'}`);
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 答案落在 ${r.quiz.spread} 个位置 · 最短解释 ${r.quiz.minExplain} 汉字`
  );
  console.log('');
  console.log('※ 以上结构与数字全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为质量标准与检测数据建模的教学讨论，不构成药品质量判定、药事管理或临床用药建议。');
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
  segments,
  dataElementAttrs,
  inspectionItems,
  dataVolume,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  CLAUSE_FIELDS,
  EXPECTED_SEGMENTS,
  DATA_ELEMENT_ATTRS,
  INSPECTION_ITEMS,
  SECTION_PROBES,
};
