#!/usr/bin/env node
/**
 * 中医国际教育 · 第 4 章 · 学历认的是「学过」，执照认的是「能用」
 * 课程: departments/06-guanli/15-zhongyi-guojijiaoyu/chapters/04-e154/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的结构与数字全部从正文现算：
 *   两条轨道与各自的判据、四种错位、执照考试四块、六环核对链条，
 *   以及「1,200 小时方剂课」与「同一段经历折成 300 或 80 小时」那笔账。
 * 不写死结论：正文一改，重跑就能看出是哪一行对不上，测试再把结论固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '4';
const SLUG = '04-e154';
const TITLE = '学历认的是「学过」，执照认的是「能用」';

/** 两条轨道，正文第一节 */
const TRACKS = ['学历互认', '执业准入'];
/** 四种错位，正文第二节 */
const MISALIGNMENTS = [
  '学位高低与执业范围倒挂',
  '学时口径不通',
  '师资资质不被承认',
  '语言门槛被误当成语言能力',
];
/** 六环核对链条，正文第四节，顺序即正文所写 */
const CHAIN = ['课程目标', '学时分布', '临床小时', '考试科目', '执照范围', '就业岗位'];

const LINES = /\r?\n/;

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const occurrences = (text, term) => String(text).split(term).length - 1;
const num = (s) => Number(String(s).replace(/,/g, ''));

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

const h2Titles = (text) => h2Sections(text).map((s) => s.title);
const sectionAt = (text, i) => h2Sections(text)[i] || { title: '', body: '' };

function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** 第二节：四种错位，段首句给出名称 */
function misalignments(text) {
  const body = sectionAt(text, 1).body;
  const out = [];
  for (const m of body.matchAll(/\*\*第([一二三四])种：(.+?)。\*\*/g)) out.push({ n: m[1], name: m[2].trim() });
  return out;
}

/** 第一节末那句总结：互认看总量与层级，准入看科目与小时 */
function trackRule(text) {
  const m = /互认看「(.+?)」，准入看「(.+?)」/.exec(text);
  return m ? { recognition: m[1], licensure: m[2] } : { recognition: '', licensure: '' };
}

/** 第三节：执照考试的四块内容，一句话列全 */
function examBlocks(text) {
  const m = /通常包含四块内容：([^。]+)。/.exec(text);
  return m ? m[1].split('、').map((s) => s.trim()) : [];
}

/** 第四节：六环链条，按「→」拆开 */
function chain(text) {
  const m = /\*\*(课程目标\s*→[^*]+?)。\*\*/.exec(text);
  return m ? m[1].split('→').map((s) => s.trim()) : [];
}

/**
 * 工时账：
 *   1,200 小时方剂课（学历里有）与同一段实习折成 300 或 80 小时（准入认的）。
 * 两个折算口径的差距由此现算。
 */
function hourLedger(text) {
  const formula = num((/学过\s*([\d,]+)\s*小时的方剂课/.exec(text) || [])[1]);
  const m = /折成\s*(\d+)\s*小时，也可以折成\s*(\d+)\s*小时/.exec(text);
  const high = m ? Number(m[1]) : NaN;
  const low = m ? Number(m[2]) : NaN;
  return { formula, high, low, gap: high / low };
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
    answers: qs.map((q) => q.correct),
  };
}

function analyze() {
  const text = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    tracks: TRACKS.map((t) => ({ t, n: occurrences(text, t) })),
    rule: trackRule(text),
    misalignments: misalignments(text),
    exam: examBlocks(text),
    chain: chain(text),
    ledger: hourLedger(text),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  const l = r.ledger;
  console.log(`中医国际教育 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`两条轨道（第 1 节）：${r.tracks.map((x) => `${x.t}(${x.n})`).join(' · ')}`);
  console.log(`  判据分工：互认看「${r.rule.recognition}」，准入看「${r.rule.licensure}」`);
  console.log('');
  console.log(`四种错位（第 2 节，${r.misalignments.length} 种）：`);
  for (const m of r.misalignments) console.log(`  第${m.n}种 ${m.name}`);
  console.log('');
  console.log(`执照考试四块（第 3 节）：${r.exam.join(' · ')}`);
  console.log(`六环链条（第 4 节）：${r.chain.join(' → ')}`);
  console.log('');
  console.log('工时账（读自正文）：');
  console.log(`  学历里有 ${l.formula.toLocaleString('en-US')} 小时的方剂课；同一段实习按两种口径折成 ${l.high} 或 ${l.low} 小时，差 ${l.gap} 倍`);
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 答案 ${r.quiz.answers.join('/')} · 最短解释 ${r.quiz.minExplain} 汉字`
  );
  console.log('');
  console.log('※ 以上结构与数字全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为学历互认与执业准入的教学讨论，不构成学历认证、执业注册或法律意见。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  hanzi,
  occurrences,
  h2Titles,
  h2Sections,
  sectionAt,
  grams,
  misalignments,
  trackRule,
  examBlocks,
  chain,
  hourLedger,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TRACKS,
  MISALIGNMENTS,
  CHAIN,
};
