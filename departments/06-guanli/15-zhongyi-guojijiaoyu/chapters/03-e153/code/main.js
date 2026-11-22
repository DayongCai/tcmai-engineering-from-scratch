#!/usr/bin/env node
/**
 * 中医国际教育 · 第 3 章 · 课程被压缩时，先死的是临床
 * 课程: departments/06-guanli/15-zhongyi-guojijiaoyu/chapters/03-e153/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的结构与数字全部从正文现算：
 *   三项硬约束、四块不可压缩核、教材三层、临床基地四条件与三重不可控，
 *   以及「180 学分 × 25–30 小时」「诊断学 90–120 → 36 学时」两笔账。
 * 不写死结论：正文一改，重跑就能看出是哪一行对不上，测试再把结论固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '3';
const SLUG = '03-e153';
const TITLE = '课程被压缩时，先死的是临床';

/** 三项硬约束，正文第一节 */
const CONSTRAINTS = ['学时', '执业范围', '法规'];
/** 四块不可压缩核，正文第二节 */
const CORE = ['四诊的采集训练', '方剂与中药的联动', '经典与临床的绑定', '复诊与调整'];
/** 教材三层，正文第三节 */
const LAYERS = ['直译原版', '改编', '本地编写'];
/** 临床基地的四个条件，正文第四节一句话里列全 */
const CLINIC_CONDITIONS = ['病例数量稳定', '病种覆盖足够', '带教者有教学训练', '患者知情同意与隐私合规'];
/** 私人诊所带教的三重不可控，正文第四节 */
const UNCONTROLLABLE = ['病例不可控', '病种偏窄', '带教不可控'];

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

/** 某节里以「**标题。**」起头的段首句 */
function boldHeads(body) {
  const out = [];
  for (const m of String(body).matchAll(/\*\*([^*。]{2,12})。\*\*/g)) out.push(m[1].trim());
  return out;
}

/** 第三节：三层教材，各自的失真落在哪 */
function layers(text) {
  const body = sectionAt(text, 2).body;
  const out = [];
  for (const m of body.matchAll(/\*\*第([一二三])层是(.+?)。\*\*/g)) out.push({ n: m[1], name: m[2].trim() });
  return out;
}

/**
 * 学分账：学分数 × 每学分小时数的上下界 = 总量；
 * 再取「三分之一」推出留给专业课的空间。
 */
function creditBudget(text) {
  const credits = num((/约\s*([\d,]+)\s*学分/.exec(text) || [])[1]);
  const hm = /每学分对应\s*(\d+)\s*至\s*(\d+)\s*小时/.exec(text);
  const lowH = hm ? Number(hm[1]) : NaN;
  const highH = hm ? Number(hm[2]) : NaN;
  const tm = /总量在\s*([\d,]+)\s*至\s*([\d,]+)\s*小时之间/.exec(text);
  const statedLow = tm ? num(tm[1]) : NaN;
  const statedHigh = tm ? num(tm[2]) : NaN;
  return {
    credits,
    lowH,
    highH,
    statedLow,
    statedHigh,
    totalLow: credits * lowH,
    totalHigh: credits * highH,
    majorLow: (credits * lowH) / 3,
    majorHigh: (credits * highH) / 3,
  };
}

/**
 * 诊断学那笔账：国内的 90–120 学时，到海外排 36 学时。
 * 折成比例，看还剩几成。
 */
function diagnosticsBudget(text) {
  const m = /通常是\s*(\d+)\s*至\s*(\d+)\s*学时[^。]*?它被排到\s*(\d+)\s*学时/.exec(text);
  const cnLow = m ? Number(m[1]) : NaN;
  const cnHigh = m ? Number(m[2]) : NaN;
  const abroad = m ? Number(m[3]) : NaN;
  return {
    cnLow,
    cnHigh,
    abroad,
    shareLow: abroad / cnHigh,
    shareHigh: abroad / cnLow,
  };
}

/** 第四节：四个条件在一句话里列全；三重不可控以加粗词嵌在段落里 */
function clinic(text) {
  const body = sectionAt(text, 3).body;
  return {
    conditions: CLINIC_CONDITIONS.map((t) => ({ t, ok: body.includes(t) })),
    uncontrollable: UNCONTROLLABLE.map((t) => ({ t, ok: body.includes(`**${t}**`) })),
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
    answers: qs.map((q) => q.correct),
  };
}

function analyze() {
  const text = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    constraints: boldHeads(sectionAt(text, 0).body),
    core: boldHeads(sectionAt(text, 1).body),
    layers: layers(text),
    credit: creditBudget(text),
    diagnostics: diagnosticsBudget(text),
    pulseTypes: Number((/背下了\s*(\d+)\s*种脉/.exec(text) || [])[1]),
    clinic: clinic(text),
    chainRule: /串联关系，不是并联/.test(text),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  const c = r.credit;
  const d = r.diagnostics;
  console.log(`中医国际教育 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`三项硬约束（第 1 节）：${r.constraints.join(' / ')}`);
  console.log(`四块不可压缩核（第 2 节）：${r.core.join(' / ')}`);
  console.log(`  串联而非并联：${r.chainRule ? '已写' : '未写'}`);
  console.log(`教材三层（第 3 节）：${r.layers.map((x) => x.name).join(' → ')}`);
  console.log(`临床基地四条件（第 4 节）：${r.clinic.conditions.map((x) => `${x.ok ? '✓' : '✗'}${x.t}`).join(' · ')}`);
  console.log(`私人诊所三重不可控：${r.clinic.uncontrollable.map((x) => `${x.ok ? '✓' : '✗'}${x.t}`).join(' / ')}`);
  console.log('');
  console.log('学分账（输入均读自正文）：');
  console.log(`  ${c.credits} 学分 × ${c.lowH}–${c.highH} 小时 = ${c.totalLow.toLocaleString('en-US')}–${c.totalHigh.toLocaleString('en-US')} 小时（正文自述 ${c.statedLow.toLocaleString('en-US')}–${c.statedHigh.toLocaleString('en-US')}）`);
  console.log(`  总量的三分之一 → 专业课 ${c.majorLow.toLocaleString('en-US')}–${c.majorHigh.toLocaleString('en-US')} 小时`);
  console.log('诊断学账：');
  console.log(`  国内 ${d.cnLow}–${d.cnHigh} 学时 → 海外 ${d.abroad} 学时，只剩 ${(d.shareLow * 100).toFixed(0)}%–${(d.shareHigh * 100).toFixed(0)}%`);
  console.log(`  学生背下 ${r.pulseTypes} 种脉的形容，一种也没摸过。`);
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 答案 ${r.quiz.answers.join('/')} · 最短解释 ${r.quiz.minExplain} 汉字`
  );
  console.log('');
  console.log('※ 以上结构与数字全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为课程设计与教育认证的教学讨论，不构成教育认证、课程审批或临床训练标准意见。');
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
  boldHeads,
  layers,
  creditBudget,
  diagnosticsBudget,
  clinic,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  CONSTRAINTS,
  CORE,
  LAYERS,
  CLINIC_CONDITIONS,
  UNCONTROLLABLE,
};
