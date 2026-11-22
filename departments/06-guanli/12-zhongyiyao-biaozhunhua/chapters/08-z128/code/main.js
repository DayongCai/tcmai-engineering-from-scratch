#!/usr/bin/env node
/**
 * 中医药标准化 · 第 8 章 · 标准发出去不算完，要能算出它有没有用
 * 课程: departments/06-guanli/12-zhongyiyao-biaozhunhua/chapters/08-z128/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的结构与数字全部从正文现算：
 *   三个指标、四种证据、复审三问、三类失败、四个去处，
 *   以及「0.90 × 0.70 × 0.50」与两年覆盖率口径漂移那两笔账。
 * 不写死常数：正文一改，重跑即可看出哪一行对不上，测试再把结论固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '8';
const SLUG = '08-z128';
const TITLE = '标准发出去不算完，要能算出它有没有用';

/** 三个评价指标，正文第一节 */
const INDICATORS = ['覆盖率', '符合率', '有效率'];

/** 四种证据，强度递增，正文第三节 */
const EVIDENCES = ['文件证据', '记录证据', '现场证据', '结局证据'];

/** 复审三问，正文第四节 */
const REVIEW_QUESTIONS = ['还有效吗', '还适用吗', '还有更好的吗'];

/** 合规检查的三类失败，正文第五节 */
const FAILURES = ['无记录', '记录与事实不符', '有记录不执行'];

/** 评价结果的四个去处，正文第六节 */
const DESTINATIONS = ['修订输入', '培训输入', '采购与评审依据', '资源分配'];

/** 每节一个探针词：第 i 个必须出现在第 i 节 */
const SECTION_PROBES = [
  '分母是「应使用该标准的机构',
  '口径漂移',
  '文件证据',
  '复审不是走程序',
  '无记录',
  '评价结果至少有四个去处',
  '指标可算不等于可信',
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

/** 三个指标的口径：覆盖率的分母按机构还是按病例，正文点名最容易混用的地方 */
function indicators(text) {
  return INDICATORS.map((t) => ({ t, n: occurrences(text, t) }));
}

/**
 * 三个数相乘：本章开头的账。0.90 × 0.70 × 0.50 ≈ 0.315，
 * 三个数各自都过半数，乘起来才看见十份里只有三份出头。
 */
function product(text) {
  const m = new RegExp(
    `覆盖率百分之([${NUM}]+)、符合率百分之([${NUM}]+)、有效率百分之([${NUM}]+)`
  ).exec(text);
  if (!m) return null;
  const cover = cn2num(m[1]) / 100;
  const match = cn2num(m[2]) / 100;
  const effect = cn2num(m[3]) / 100;
  const raw = cover * match * effect;
  return { cover, match, effect, raw, rounded: raw.toFixed(3) };
}

/**
 * 分母漂移：第一年应使用一百家、实际使用九十家；第二年把「应使用」调整为六十家、实际五十四家。
 * 覆盖率两年都是九成，覆盖的机构却少了四成。四个数都读正文，比率为现算。
 */
function drift(text) {
  const y1 = new RegExp(`机构有([${NUM}]+)家，实际使用([${NUM}]+)家`).exec(text);
  const y2 = new RegExp(`范围调整为([${NUM}]+)家[^。]*?实际使用([${NUM}]+)家`).exec(text);
  if (!y1 || !y2) return null;
  const base1 = cn2num(y1[1]);
  const used1 = cn2num(y1[2]);
  const base2 = cn2num(y2[1]);
  const used2 = cn2num(y2[2]);
  return {
    base1,
    used1,
    base2,
    used2,
    rate1: used1 / base1,
    rate2: used2 / base2,
    shrink: 1 - base2 / base1,
  };
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
    indicators: indicators(text),
    evidences: EVIDENCES.map((t) => ({ t, n: occurrences(text, t) })),
    questions: REVIEW_QUESTIONS.map((t) => ({ t, n: occurrences(text, t) })),
    failures: FAILURES.map((t) => ({ t, n: occurrences(text, t) })),
    destinations: DESTINATIONS.map((t) => ({ t, n: occurrences(text, t) })),
    product: product(text),
    drift: drift(text),
    cycle: numFrom(text, new RegExp(`复审周期一般不超过([${NUM}]+)年`)),
    nobody: /有人在用吗/.test(text),
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
  console.log(`三个指标：${r.indicators.map((x) => `${x.t}(${x.n})`).join(' · ')}`);
  console.log(`四种证据（强度递增）：${r.evidences.map((x) => `${x.t}(${x.n})`).join(' · ')}`);
  console.log(`复审三问：${r.questions.map((x) => `${x.t}(${x.n})`).join(' · ')}；第四问「有人在用吗」：${r.nobody ? '已写' : '未写'}`);
  console.log(`合规失败三类：${r.failures.map((x) => `${x.t}(${x.n})`).join(' · ')}`);
  console.log(`评价结果四个去处：${r.destinations.map((x) => `${x.t}(${x.n})`).join(' · ')}`);
  console.log(`复审周期：一般不超过 ${Number.isNaN(r.cycle) ? '—' : r.cycle} 年`);
  console.log('');
  if (r.product) {
    const p = r.product;
    console.log('演算一（三个数相乘，正文开头那笔账）：');
    console.log(`  ${p.cover} × ${p.match} × ${p.effect} = ${p.raw.toFixed(4)} ≈ ${p.rounded}`);
  }
  if (r.drift) {
    const d = r.drift;
    console.log('演算二（覆盖率两年不变，分母变了）：');
    console.log(`  第一年 ${d.used1}/${d.base1} = ${(d.rate1 * 100).toFixed(0)}%；第二年 ${d.used2}/${d.base2} = ${(d.rate2 * 100).toFixed(0)}%`);
    console.log(`  比率一字不改，覆盖的机构少了 ${(d.shrink * 100).toFixed(0)}%`);
  }
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 答案落在 ${r.quiz.spread} 个位置 · 最短解释 ${r.quiz.minExplain} 汉字`
  );
  console.log('');
  console.log('※ 以上结构与数字全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为标准实施评价与合规方法的教学讨论，不构成法律意见、监管符合性判定或绩效评价建议。');
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
  indicators,
  product,
  drift,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  INDICATORS,
  EVIDENCES,
  REVIEW_QUESTIONS,
  FAILURES,
  DESTINATIONS,
  SECTION_PROBES,
};
