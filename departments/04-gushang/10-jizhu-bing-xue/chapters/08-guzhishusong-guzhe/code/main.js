#!/usr/bin/env node
/**
 * 脊柱病学 · 第 8 章 · 一次椎体压缩骨折，是下一次骨折的预告
 * 课程: departments/04-gushang/10-jizhu-bing-xue/chapters/08-guzhishusong-guzhe/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字全部由本脚本从正文现算，不手打：
 *   汉字数、小节标题与顺序、每节探针词、关键判据词频，
 *   脆性骨折的常见部位、急性期三件事及其次序、
 *   二级预防四块、中医辨证三端、再骨折的风险窗口，
 *   以及 quiz 的 check 题接地情况。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '8';
const SLUG = '08-guzhishusong-guzhe';
const TITLE = '一次椎体压缩骨折，是下一次骨折的预告';

/** 关键判据词：本章反复使用的说法，是正文与习题同源的最小证据 */
const TERMS = ['脆性骨折', '骨髓水肿', '骨水泥', '驼背', '双能 X 线吸收法', '二级预防', '骨痿', '负重'];

/** 每节一个探针词：第 i 个必须落在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = ['低能量外力', '骨髓水肿', '先止痛', '骨水泥', '二级预防有四块', '是影像的时间判断'];

/** 二级预防的四块（正文第五节「一是…四是…」） */
const TCM_ENDS = ['肾虚', '脾虚', '血瘀'];

const readDoc = () => fs.readFileSync(DOC, 'utf8');

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

function h2Titles(text) {
  const out = [];
  for (const line of String(text).split(/\r?\n/)) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) out.push(m[1].trim());
  }
  return out;
}

function h2Sections(text) {
  const out = [];
  let cur = null;
  for (const line of String(text).split(/\r?\n/)) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) {
      cur = { title: m[1].trim(), body: [line] };
      out.push(cur);
    } else if (cur) cur.body.push(line);
  }
  return out.map((s) => ({ title: s.title, body: s.body.join('\n') }));
}

const sectionAt = (text, i) => (h2Sections(text)[i] || { title: '', body: '' }).body;

const occurrences = (text, term) => String(text).split(term).length - 1;

function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text).replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

function lineWith(text, needle) {
  return String(text).split(/\r?\n/).find((l) => l.includes(needle)) || '';
}

function listAfter(text, needle, sep) {
  const line = lineWith(text, needle);
  const at = line.indexOf(needle);
  if (at < 0) return [];
  let rest = line.slice(at + needle.length).replace(/^[：:，]/, '');
  rest = rest.replace(/。.*$/, '');
  return rest
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean);
}

const countItems = (body) => (String(body).match(/(^|[。：\s])[一二三四五六七八九]是/g) || []).length;

/** 加粗小标题（去掉句末句号） */
const boldTitles = (body) =>
  [...String(body).matchAll(/\*\*([^*]{2,14})。\*\*/g)].map((m) => m[1].trim());

/** 脆性骨折的常见部位：椎体最常，其余按「其次是…」列出 */
function fractureSites(text) {
  const rest = listAfter(text, '其次是', '、');
  return ['椎体', ...rest].filter((s) => s && text.includes(s.replace(/^以及/, '')));
}

/** 急性期三件事：正文第三节的加粗小标题 */
const acuteThree = (text) => boldTitles(sectionAt(text, 2));

/** 二级预防四块：正文第五节的编号条目 */
const preventionFour = (text) => countItems(sectionAt(text, 4));

/** 中医辨证三端 */
const tcmEnds = (text) => TCM_ENDS.filter((k) => text.includes(k));

/** 本章的两句硬话：脆性骨折即诊断、一次骨折即预告 */
function hardRules(text) {
  return {
    fragilityIsDx: text.includes('脆性骨折即骨质疏松'),
    strongestPredictor: text.includes('它是下一次骨折的最强预测因子'),
    window: text.includes('集中在骨折后的头一两年'),
    orderNotReversible: text.includes('这三件事的顺序不能颠倒'),
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
  };
}

function chapterFacts() {
  const text = readDoc();
  return {
    sites: fractureSites(text),
    acute: acuteThree(text),
    preventive: preventionFour(text),
    tcm: tcmEnds(text),
    rules: hardRules(text),
  };
}

function analyze() {
  const text = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    terms: TERMS.map((t) => ({ term: t, count: occurrences(text, t) })),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).includes(p) })),
    quiz: quizSummary(quiz, text),
    facts: chapterFacts(),
  };
}

function main() {
  const r = analyze();
  const f = r.facts;
  console.log(`脊柱病学 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`脆性骨折常见部位 ${f.sites.length} 处：${f.sites.join(' · ')}`);
  console.log(`急性期 ${f.acute.length} 件事：${f.acute.join(' → ')} · 顺序不可颠倒：${f.rules.orderNotReversible ? '✓' : '✗'}`);
  console.log(`二级预防 ${f.preventive} 块 · 中医辨证 ${f.tcm.length} 端：${f.tcm.join(' · ')}`);
  console.log(
    `两句硬话：脆性骨折即诊断 ${f.rules.fragilityIsDx ? '✓' : '✗'} · 最强预测因子 ${f.rules.strongestPredictor ? '✓' : '✗'}` +
      ` · 风险窗口（头一两年）${f.rules.window ? '✓' : '✗'}`
  );
  console.log('');
  console.log('关键判据（出现次数）：');
  console.log('  ' + r.terms.map((x) => `${x.term} ${x.count}`).join(' · '));
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）` +
      ` · check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）`
  );
  console.log('');
  console.log('※ 以上数字与清单全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成诊疗建议、诊断或治疗指导。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  h2Titles,
  h2Sections,
  sectionAt,
  occurrences,
  grams,
  lineWith,
  listAfter,
  countItems,
  boldTitles,
  fractureSites,
  acuteThree,
  preventionFour,
  tcmEnds,
  hardRules,
  quizSummary,
  chapterFacts,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TERMS,
  SECTION_PROBES,
};
