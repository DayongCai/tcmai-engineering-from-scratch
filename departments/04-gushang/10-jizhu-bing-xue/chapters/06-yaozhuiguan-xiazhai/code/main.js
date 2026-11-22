#!/usr/bin/env node
/**
 * 脊柱病学 · 第 6 章 · 走不远的人：狭窄与滑脱，先分清是管窄还是骨错位
 * 课程: departments/04-gushang/10-jizhu-bing-xue/chapters/06-yaozhuiguan-xiazhai/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字全部由本脚本从正文现算，不手打：
 *   汉字数、小节标题与顺序、每节探针词、关键判据词频，
 *   两类跛行的特征句、狭窄的三个区、影像四项测量、
 *   两类滑脱、保守能做的五条与不能做的三条、转介四类，
 *   以及 quiz 的 check 题接地情况。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '6';
const SLUG = '06-yaozhuiguan-xiazhai';
const TITLE = '走不远的人：狭窄与滑脱，先分清是管窄还是骨错位';

/** 关键判据词：本章反复使用的说法，是正文与习题同源的最小证据 */
const TERMS = [
  '跛行',
  '三叶草',
  '侧隐窝',
  'Meyerding',
  '峡部裂',
  '跌倒风险',
  '踝肱指数',
  '屈曲方向',
];

/** 每节一个探针词：第 i 个必须落在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = [
  '神经源性跛行',
  '三叶草',
  'Meyerding',
  '长期卧床',
  '四类情形',
  '必须问到距离、姿势与缓解方式',
];

/** 影像上的四项测量（正文第二节列举） */
const MEASUREMENTS = ['椎管前后径', '硬膜囊横截面积', '侧隐窝宽度', '椎间孔高度'];

/** 狭窄的三个区（正文第二节列举） */
const ZONES = ['中央管狭窄', '侧隐窝狭窄', '椎间孔狭窄'];

const CN = /[一二三四五六七八九十]/g;

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

/** 「一是…二是…」这类编号条目：按「X是」计数，X 是中文数字 */
const countItems = (body) => (String(body).match(/(^|[。：\s])[一二三四五六七八九]是/g) || []).length;

/** 两类跛行的特征句：正文「X 跛行的特点是」 */
function claudicationTypes(text) {
  return [...String(text).matchAll(/(神经源性|血管性)跛行(?:（[^）]*）)?的特点是/g)].map((m) => `${m[1]}跛行`);
}

/** 两类滑脱：正文第三节的加粗小标题 */
function slipTypes(text) {
  return [...sectionAt(text, 2).matchAll(/\*\*([^*]{2,12})。\*\*/g)].map((m) => m[1].trim());
}

/** 保守治疗分成两栏：能做／不能做，各按编号条目计数 */
function conservativeSplit(text) {
  const body = sectionAt(text, 3);
  const at = body.indexOf('不能做的');
  const can = at < 0 ? body : body.slice(0, at);
  const cannot = at < 0 ? '' : body.slice(at);
  return { can: countItems(can), cannot: countItems(cannot) };
}

/** 转介四类：正文第四节「一是…四是…」 */
function referralCount(text) {
  return countItems(sectionAt(text, 4));
}

/** 影像与随访的落点：正文里必须落到测量与功能上的几句 */
function measurementFocus(text) {
  return {
    measurements: MEASUREMENTS.filter((m) => text.includes(m)),
    zones: ZONES.filter((z) => text.includes(z)),
    functionalFollowUp: text.includes('退变性滑脱看功能'),
    growthFollowUp: text.includes('峡部裂性滑脱看生长'),
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
    claudication: claudicationTypes(text),
    slipTypes: slipTypes(text),
    conservative: conservativeSplit(text),
    referrals: referralCount(text),
    focus: measurementFocus(text),
    meyerding: text.includes('被分为四到五度'),
    fallRisk: text.includes('跌倒风险'),
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
  console.log(`跛行 ${f.claudication.length} 类：${f.claudication.join(' vs ')}`);
  console.log(`狭窄 ${f.focus.zones.length} 区：${f.focus.zones.join(' · ')}`);
  console.log(`影像测量 ${f.focus.measurements.length} 项：${f.focus.measurements.join(' · ')}`);
  console.log(`滑脱 ${f.slipTypes.length} 类：${f.slipTypes.join(' · ')} · Meyerding 四到五度：${f.meyerding ? '✓' : '✗'}`);
  console.log(`随访：功能 ${f.focus.functionalFollowUp ? '✓' : '✗'} · 生长 ${f.focus.growthFollowUp ? '✓' : '✗'}`);
  console.log(`保守：能做 ${f.conservative.can} 条 · 不能做 ${f.conservative.cannot} 条`);
  console.log(`转介 ${f.referrals} 类 · 跌倒风险已写：${f.fallRisk ? '✓' : '✗'}`);
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
  countItems,
  claudicationTypes,
  slipTypes,
  conservativeSplit,
  referralCount,
  measurementFocus,
  quizSummary,
  chapterFacts,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TERMS,
  SECTION_PROBES,
  MEASUREMENTS,
  ZONES,
};
