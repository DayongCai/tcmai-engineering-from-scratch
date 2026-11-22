#!/usr/bin/env node
/**
 * 中医药标准化 · 第 7 章 · 操作规范写在纸上，扎针的手不会自己变标准
 * 课程: departments/06-guanli/12-zhongyiyao-biaozhunhua/chapters/07-z127/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的结构与数字全部从正文现算：
 *   六要素、可观察化三级台阶、三个嵌入点、不良事件四件事，
 *   以及「四十条里二十四条可查」的覆盖率与零缺陷抽样的样本量。
 * 不写死常数：正文一改，重跑即可看出哪一行对不上，测试再把结论固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '7';
const SLUG = '07-z127';
const TITLE = '操作规范写在纸上，扎针的手不会自己变标准';

/** 六要素，正文第一节按段序 */
const ELEMENTS = ['适应症与禁忌', '体位与暴露', '定位', '手法参数', '疗程与间隔', '不良事件处置'];

/** 可观察化三级台阶，正文第二节 */
const LEVELS = ['可观察', '可测量', '可判定'];

/** 规范进流程的三个嵌入点，正文第三节 */
const EMBEDS = ['医嘱模板', '执行记录', '审核规则'];

/** 不良事件要写厚的四件事，正文第六节 */
const EVENT_PARTS = ['分类', '字段', '路径', '回修'];

/** 每节一个探针词：第 i 个必须出现在第 i 节 */
const SECTION_PROBES = [
  '六要素',
  '三级台阶',
  '三个嵌入点',
  '零缺陷抽样',
  '安全底线',
  '回修',
  '结构化记录有代价',
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

/**
 * 覆盖率：正文说四十条里能落到可观察动作的不到一半，
 * 逐条数下来只有二十四条可查。两个数都读正文，比值现算。
 */
function coverage(text) {
  const clauses = numFrom(text, new RegExp(`正文([${NUM}]+)条`));
  const checkable = numFrom(text, new RegExp(`只有([${NUM}]+)条可查`));
  const claimed = numFrom(text, new RegExp(`符合率百分之([${NUM}]+)`));
  return { clauses, checkable, claimed, ratio: checkable / clauses };
}

/**
 * 零缺陷抽样：不符合率低于百分之五、置信度百分之九十五时的样本量。
 * 公式 n = ln(失败概率) / ln(合格概率)，向上取整；正文给的近似值是五十九例。
 */
function zeroDefectSample(failProb = 0.05, conf = 0.95) {
  return Math.ceil(Math.log(failProb) / Math.log(conf));
}

/** 六要素：逐项在本节里找，缺哪项就少一项 */
function elements(text) {
  const body = sectionAt(text, 0).body;
  return ELEMENTS.map((t) => ({ t, ok: body.includes(t) }));
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
    elements: elements(text),
    levels: LEVELS.map((t) => ({ t, n: occurrences(text, t) })),
    embeds: EMBEDS.map((t) => ({ t, n: occurrences(text, t) })),
    events: EVENT_PARTS.map((t) => ({ t, n: occurrences(text, t) })),
    cover: coverage(text),
    n: zeroDefectSample(),
    statedN: numFrom(text, new RegExp(`约为([${NUM}]+)例`)),
    codes: /穴位、手法、禁忌必须已经编码/.test(text),
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
  console.log(`六要素（第 1 节）：${r.elements.map((x) => `${x.ok ? '✓' : '✗'} ${x.t}`).join(' · ')}`);
  console.log(`三级台阶：${r.levels.map((x) => `${x.t}(${x.n})`).join(' · ')}`);
  console.log(`三个嵌入点：${r.embeds.map((x) => `${x.t}(${x.n})`).join(' · ')}`);
  console.log(`不良事件四件事：${r.events.map((x) => `${x.t}(${x.n})`).join(' · ')}`);
  console.log(`三个嵌入点的共同前提（穴位、手法、禁忌已编码）：${r.codes ? '已写' : '未写'}`);
  console.log('');
  const c = r.cover;
  console.log('演算一（覆盖率，两个数均读自正文）：');
  console.log(`  ${c.checkable} ÷ ${c.clauses} = ${(c.ratio * 100).toFixed(0)}% 的条款可查；报告却写符合率 ${c.claimed}%`);
  console.log('演算二（零缺陷抽样）：');
  console.log(`  n = ln0.05 ÷ ln0.95 ≈ ${r.n} 例（正文自述约为 ${Number.isNaN(r.statedN) ? '—' : r.statedN} 例）`);
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 答案落在 ${r.quiz.spread} 个位置 · 最短解释 ${r.quiz.minExplain} 汉字`
  );
  console.log('');
  console.log('※ 以上结构与数字全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为技术操作规范编写与流程嵌入的教学讨论，不构成具体操作指导、诊疗建议或合规意见。');
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
  coverage,
  zeroDefectSample,
  elements,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  ELEMENTS,
  LEVELS,
  EMBEDS,
  EVENT_PARTS,
  SECTION_PROBES,
};
