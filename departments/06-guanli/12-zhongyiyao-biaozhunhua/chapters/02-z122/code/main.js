#!/usr/bin/env node
/**
 * 中医药标准化 · 第 2 章 · 标准的分量，取决于它站在哪一层
 * 课程: departments/06-guanli/12-zhongyiyao-biaozhunhua/chapters/02-z122/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的表格与数字全部从正文现算：
 *   五层规范的制定主体与约束力、七步程序与产出物、三类层级冲突，
 *   以及「六百字段 × 三层 → 一千八百处 × 十五分钟」折成工时的演算。
 * 不写死常数：正文一改，重跑即可看出哪一行对不上，测试再把结论固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '2';
const SLUG = '02-z122';
const TITLE = '标准的分量，取决于它站在哪一层';

/** 五层规范，正文第一张表首列，表序即此序 */
const EXPECTED_LAYERS = ['国家标准', '行业标准', '地方标准', '团体标准', '企业标准'];

/** 制定程序七步的动作，正文第二张表第二列 */
const EXPECTED_STEPS = ['预研', '立项', '起草', '征求意见', '技术审查', '批准发布', '实施与复审'];

/** 层级冲突的三种形态，正文第三节 */
const CONFLICT_TYPES = ['定义冲突', '指标冲突', '方法冲突'];

/** 每节一个探针词：第 i 个必须出现在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = [
  '强制与推荐的分野',
  '编制说明',
  '方法冲突',
  '规范性附录',
  '配置项',
  '加严有成本',
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

/** 五层规范：第一张表的层级与约束力两列 */
function layers(text) {
  const t = tableBlocks(text)[0];
  if (!t) return [];
  return t.rows.map((r) => ({ name: r[0], scope: r[2], force: r[3], review: r[4] }));
}

/** 七步程序：第二张表的动作与产出物 */
function steps(text) {
  const t = tableBlocks(text)[1];
  if (!t) return [];
  return t.rows.map((r) => ({ no: r[0], action: r[1], output: r[2], idle: r[3] }));
}

/** 三类冲突的现场修法：第三节每段的开头三个粗体 -->
 *  正文没有表格，这里按「定义冲突：」「指标冲突：」「方法冲突：」切段 */
function conflictFixes(text) {
  const body = sectionAt(text, 2).body;
  return CONFLICT_TYPES.map((t) => {
    const i = body.indexOf(t + '：');
    const rest = i < 0 ? '' : body.slice(i + t.length + 1);
    const stop = CONFLICT_TYPES.map((x) => rest.indexOf(x + '：')).filter((n) => n >= 0);
    const seg = rest.slice(0, stop.length ? Math.min(...stop) : rest.length);
    return { type: t, text: seg.trim() };
  });
}

/**
 * 正文开头那笔账：字段数 × 每字段被几层各规定一次 → 处数 → 分钟 → 工时 → 工作日。
 * 四个输入全部从正文读取，不写常数。
 */
function reviewCost(text) {
  const fields = numFrom(text, new RegExp(`字段约([${NUM}]+)个`));
  const layersPer = numFrom(text, new RegExp(`被([${NUM}]+)层文件各规定一次`));
  const minutes = numFrom(text, new RegExp(`每处按([${NUM}]+)分钟核`));
  const perDay = numFrom(text, new RegExp(`折([${NUM}]+)个工作日`));
  const spots = fields * layersPer;
  const hours = (spots * minutes) / 60;
  const days = Math.round(hours / 8);
  return { fields, layersPer, minutes, spots, hours, days, stated: perDay };
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
    layers: layers(text),
    steps: steps(text),
    conflicts: conflictFixes(text),
    cost: reviewCost(text),
    appendix: /规范性附录是标准的组成部分/.test(text) && /资料性附录只是参考资料/.test(text),
    strictly: /下位可严不可宽/.test(text) && /上位优先/.test(text),
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
  console.log(`五层规范（正文表序，${r.layers.length} 层）：`);
  for (const l of r.layers) console.log(`  ${l.name}｜范围：${l.scope}｜约束力：${l.force}｜复审：${l.review}`);
  console.log('');
  console.log(`制定程序（正文表序，${r.steps.length} 步）：`);
  for (const s of r.steps) console.log(`  ${s.no}. ${s.action} → ${s.output}（空转：${s.idle}）`);
  console.log('');
  console.log(`层级冲突三形态：${r.conflicts.map((c) => c.type).join(' / ')}`);
  console.log(`  指标冲突的修法：${r.conflicts[1].text.slice(0, 40)}…`);
  console.log(`上位优先、下位可严不可宽：${r.strictly ? '已写' : '未写'}；两类附录有别：${r.appendix ? '已写' : '未写'}`);
  console.log('');
  const c = r.cost;
  console.log('演算（四个输入均读自正文）：');
  console.log(`  ${c.fields} 字段 × 每字段 ${c.layersPer} 层 = ${c.spots.toLocaleString('en-US')} 处规定`);
  console.log(`  × ${c.minutes} 分钟 → ${c.hours} 小时 → ${c.days} 个工作日（正文自述 ${Number.isNaN(c.stated) ? '—' : c.stated} 个）`);
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 答案落在 ${r.quiz.spread} 个位置 · 最短解释 ${r.quiz.minExplain} 汉字`
  );
  console.log('');
  console.log('※ 以上清单与次数全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为标准体系与制定程序的教学讨论，不构成标准化合规、监管符合性或临床用药建议。');
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
  layers,
  steps,
  conflictFixes,
  reviewCost,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  EXPECTED_LAYERS,
  EXPECTED_STEPS,
  CONFLICT_TYPES,
  SECTION_PROBES,
};
