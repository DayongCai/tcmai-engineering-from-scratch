#!/usr/bin/env node
/**
 * 中医药标准化 · 第 6 章 · 走出国门的标准，先要学会翻译自己
 * 课程: departments/06-guanli/12-zhongyiyao-biaozhunhua/chapters/06-z126/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的结构与数字全部从正文现算：
 *   三种对接模式、四类翻译难点、三条译名判据、四件技术对接、三个互认前提，
 *   以及「三千条 × 三位专家」的工作量与两轮评审的分歧条数。
 * 不写死常数：正文一改，重跑即可看出哪一行对不上，测试再把结论固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '6';
const SLUG = '06-z126';
const TITLE = '走出国门的标准，先要学会翻译自己';

/** 三种对接模式，正文第一节 */
const MODES = ['采纳', '修改采纳', '参照'];

/** 四类翻译难点，正文第二节 */
const DIFFICULTIES = ['无对应概念', '有对应但外延不同', '译名已固化但误导', '同词多义'];

/** 三条译名判据，正文第三节 */
const CRITERIA = ['是否引入错误预设', '是否可教可学', '是否全局一致'];

/** 技术对接的四件事，正文第五节 */
const TECH_ITEMS = ['术语映射表', '编码交叉表', '单位换算', '方法等效性'];

/** 互认的三个前提，正文第六节 */
const PRECONDITIONS = ['技术等效', '监管等效', '责任可追溯'];

/** 每节一个探针词：第 i 个必须出现在第 i 节 */
const SECTION_PROBES = [
  '采纳：原样采用国际文件',
  '无对应概念',
  '是否引入错误预设',
  '一句一义',
  '术语映射表',
  '技术等效',
  '定义权',
  '音译有真实代价',
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

/** 三种模式：正文第一节每段以「采纳：」「修改采纳：」「参照：」开头 */
function modes(text) {
  const body = sectionAt(text, 0).body;
  return MODES.map((m) => {
    const at = body.indexOf(m + '：');
    return { m, at, ok: at >= 0 };
  });
}

/**
 * 评审工作量：术语数 × 每位专家一条（背对背）→ 人次；再除以每日条数 → 工作日。
 * 三个输入全部从正文读取。
 */
function reviewLoad(text) {
  const terms = numFrom(text, new RegExp(`([${NUM}]+)条术语`));
  const experts = numFrom(text, new RegExp(`([${NUM}]+)位专家`));
  const perDay = numFrom(text, new RegExp(`每人每日([${NUM}]+)条`));
  const reviews = terms * experts;
  const days = Math.round(reviews / perDay);
  const stated = numFrom(text, new RegExp(`([${NUM}]+)个工作日`));
  const share = numFrom(text, new RegExp(`分歧条目通常占([${NUM}]+)成`)) / 10;
  const disputed = Math.round(reviews * share);
  const statedDisputed = numFrom(text, new RegExp(`([${NUM}]+)条要进第二轮`));
  return { terms, experts, perDay, reviews, days, stated, share, disputed, statedDisputed };
}

/** 定义句的三条写作纪律，正文第四节 */
const DEFINITION_RULES = ['一句一义', '不引用典故与比喻', '首次出现时给上位概念'];

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
    modes: modes(text),
    difficulties: DIFFICULTIES.map((t) => ({ t, n: occurrences(text, t) })),
    criteria: CRITERIA.map((t) => ({ t, n: occurrences(text, t) })),
    tech: TECH_ITEMS.map((t) => ({ t, n: occurrences(text, t) })),
    pre: PRECONDITIONS.map((t) => ({ t, n: occurrences(text, t) })),
    rules: DEFINITION_RULES.map((t) => ({ t, ok: text.includes(t) })),
    load: reviewLoad(text),
    equiv: /只有方法比对没有室间比对/.test(text),
    paperOnly: /属于「文本互认」/.test(text),
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
  console.log(`三种对接模式（第 1 节）：${r.modes.map((x) => `${x.ok ? '✓' : '✗'} ${x.m}`).join(' · ')}`);
  console.log(`四类翻译难点：${r.difficulties.map((x) => `${x.t}(${x.n})`).join(' · ')}`);
  console.log(`三条译名判据：${r.criteria.map((x) => `${x.t}(${x.n})`).join(' · ')}`);
  console.log(`技术对接四件事：${r.tech.map((x) => `${x.t}(${x.n})`).join(' · ')}`);
  console.log(`互认三前提：${r.pre.map((x) => `${x.t}(${x.n})`).join(' · ')}`);
  console.log('');
  console.log(`定义句纪律（第 4 节）：${r.rules.map((x) => `${x.ok ? '✓' : '✗'} ${x.t}`).join(' · ')}`);
  console.log(`方法等效要双证（方法比对 + 室间比对）：${r.equiv ? '已写' : '未写'}；只满足第一条叫文本互认：${r.paperOnly ? '已写' : '未写'}`);
  console.log('');
  const l = r.load;
  console.log('演算（四个输入均读自正文）：');
  console.log(`  ${l.terms.toLocaleString('en-US')} 条 × ${l.experts} 位专家 = ${l.reviews.toLocaleString('en-US')} 人次评审`);
  console.log(`  ÷ 每人每日 ${l.perDay} 条 = ${l.days} 个工作日（正文自述 ${Number.isNaN(l.stated) ? '—' : l.stated} 个）`);
  console.log(`  分歧占 ${(l.share * 10).toFixed(0)} 成 → ${l.disputed.toLocaleString('en-US')} 条进第二轮（正文自述 ${Number.isNaN(l.statedDisputed) ? '—' : l.statedDisputed.toLocaleString('en-US')} 条）`);
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 答案落在 ${r.quiz.spread} 个位置 · 最短解释 ${r.quiz.minExplain} 汉字`
  );
  console.log('');
  console.log('※ 以上结构与数字全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为标准国际化与术语翻译的教学讨论，不构成注册申报、进出口贸易或临床用药建议。');
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
  modes,
  reviewLoad,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  MODES,
  DIFFICULTIES,
  CRITERIA,
  TECH_ITEMS,
  PRECONDITIONS,
  DEFINITION_RULES,
  SECTION_PROBES,
};
