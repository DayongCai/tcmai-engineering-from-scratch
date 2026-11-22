#!/usr/bin/env node
/**
 * 中医药标准化 · 第 3 章 · 编码错一位，临床上就是另一味药
 * 课程: departments/06-guanli/12-zhongyiyao-biaozhunhua/chapters/03-z123/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的结构与数字全部从正文现算：
 *   四种编码结构、五种映射关系、饮片码的四段、三个可核指标，
 *   以及「二百一十六万条明细 × 百分之二」与抽样量、健康度的两笔演算。
 * 不写死常数：正文一改，重跑即可看出哪一行对不上，测试再把结论固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '3';
const SLUG = '03-z123';
const TITLE = '编码错一位，临床上就是另一味药';

/** 四种编码结构，正文第一张表首列 */
const EXPECTED_STRUCTURES = ['顺序码', '层次码', '组配码', '并置码'];

/** 五种映射关系，正文第四节 */
const RELATIONS = ['一对一', '一对多', '多对一', '部分重叠', '无对应'];

/** 饮片码的四段，正文代码块的四个标注 */
const SEGMENTS = ['门类位', '品种位', '炮制位', '规格位'];

/** 编码质量的三个可核指标，正文第六节 */
const METRICS = ['唯一性', '覆盖率', '映射可审率'];

/** 每节一个探针词：第 i 个必须出现在第 i 节 */
const SECTION_PROBES = [
  '编码是给分类结果贴标签',
  '顺序码只适合',
  '炮制位独立成位',
  '关系至少有五种',
  '时点正确性',
  '映射可审率',
  '设计示意',
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

/** 四种编码结构：第一张表的形态与典型失效 */
function structures(text) {
  const t = tableBlocks(text)[0];
  if (!t) return [];
  return t.rows.map((r) => ({ name: r[0], form: r[1], capacity: r[2], failure: r[4] }));
}

/** 饮片码四段：代码块里的四个标注；优先取画出位序的那一行，避免撞上正文里的同名词 */
function segments(text) {
  const found = SEGMENTS.filter((s) => text.includes(s));
  return found.map((s) => {
    const hits = text.split(LINES).filter((l) => l.includes(s));
    const line = hits.find((l) => /[─└├│]/.test(l)) || hits[0] || '';
    return { s, line: line.trim() };
  });
}

/** 五类映射关系：每一种在正文里都必须被点到，且带处理方式 */
function relationMappings(text) {
  const body = sectionAt(text, 3).body;
  return RELATIONS.map((r) => {
    const i = body.indexOf(r + '（');
    const j = body.indexOf(r);
    const at = i >= 0 ? i : j;
    return { r, at, ok: j >= 0 };
  });
}

/**
 * 抽样量：按比例估计的常规算法，95% 置信（z=1.96）、误差 ±5 个百分点、p=0.5。
 * 公式 n = z²p(1-p)/e²，正文给的近似值是三百八十四条。
 */
function sampleSize(z = 1.96, p = 0.5, e = 0.05) {
  return Math.round((z * z * p * (1 - p)) / (e * e));
}

/**
 * 正文开头那笔账：处方量 × 每张味数 → 明细；再乘映射累计错率 → 对不上的条数。
 * 输入全部从正文读取。
 */
function errorVolume(text) {
  const rx = numFrom(text, new RegExp(`([${NUM}]+)张处方`));
  const per = numFrom(text, new RegExp(`每张([${NUM}]+)味`));
  const rateText = numFrom(text, new RegExp(`累计差错约百分之([${NUM}]+)`));
  const details = rx * per;
  const stated = numFrom(text, new RegExp(`([${NUM}]+)条明细`));
  const rate = rateText / 100;
  const bad = Math.round(details * rate);
  return { rx, per, details, stated, rate, bad };
}

/** 健康度：三项相乘，第一项取补数（一物多码率是「坏」的方向） */
function healthIndex(text) {
  const m = new RegExp(
    `一物多码率百分之([${NUM}]+)、覆盖率百分之([${NUM}]+)、映射可审率百分之([${NUM}]+)`
  ).exec(text);
  if (!m) return null;
  const multi = cn2num(m[1]) / 100;
  const cover = cn2num(m[2]) / 100;
  const audit = cn2num(m[3]) / 100;
  const raw = (1 - multi) * cover * audit;
  return { multi, cover, audit, raw, rounded: raw.toFixed(2) };
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
    structures: structures(text),
    segments: segments(text),
    relations: relationMappings(text),
    metrics: METRICS.map((m) => ({ m, n: occurrences(text, m) })),
    volume: errorVolume(text),
    n: sampleSize(),
    health: healthIndex(text),
    fourSets: /四套代码/.test(text) || /四套码/.test(text),
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
  console.log(`四种编码结构（正文表序，${r.structures.length} 种）：`);
  for (const s of r.structures) console.log(`  ${s.name}｜形态：${s.form}｜容量：${s.capacity}｜失效：${s.failure}`);
  console.log('');
  console.log(`饮片码四段（正文代码块）：${r.segments.map((s) => s.s).join(' / ')}`);
  for (const s of r.segments) console.log(`  ${s.line}`);
  console.log('');
  console.log(`五种映射关系（第 4 节）：${r.relations.map((x) => `${x.ok ? '✓' : '✗'} ${x.r}`).join(' · ')}`);
  console.log(`三个可核指标：${r.metrics.map((x) => `${x.m}(${x.n})`).join(' · ')}`);
  console.log(`四套代码与三次映射：${r.fourSets ? '正文已交代' : '正文缺失'}`);
  console.log('');
  const v = r.volume;
  console.log('演算一（读自正文）：');
  console.log(`  ${v.rx.toLocaleString('en-US')} 张/年 × ${v.per} 味 = ${v.details.toLocaleString('en-US')} 条明细（正文自述 ${Number.isNaN(v.stated) ? '—' : v.stated.toLocaleString('en-US')} 条）`);
  console.log(`  × 累计错率 ${(v.rate * 100).toFixed(0)}% → ${v.bad.toLocaleString('en-US')} 条对不上`);
  console.log('演算二（按比例估计的常规算法）：');
  console.log(`  95% 置信、±5 个百分点、p=0.5 → n = 1.96²×0.25÷0.05² ≈ ${r.n} 条`);
  if (r.health) {
    const h = r.health;
    console.log('演算三（健康度，第一项取补数）：');
    console.log(`  (1−${h.multi}) × ${h.cover} × ${h.audit} = ${h.raw.toFixed(5)} ≈ ${h.rounded}`);
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
  console.log('※ 本章为分类与编码工程的教学讨论，不构成诊疗、用药、医保结算或监管符合性建议。');
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
  structures,
  segments,
  relationMappings,
  sampleSize,
  errorVolume,
  healthIndex,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  EXPECTED_STRUCTURES,
  RELATIONS,
  SEGMENTS,
  METRICS,
  SECTION_PROBES,
};
