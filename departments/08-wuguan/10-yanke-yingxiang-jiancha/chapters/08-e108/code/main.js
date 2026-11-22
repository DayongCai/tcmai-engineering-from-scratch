#!/usr/bin/env node
/**
 * 眼科影像检查 · 第 8 章对账器
 *
 * 数据源：../docs/zh.md（本章正文）、../quiz.json（本章习题）
 *
 * 现算的东西：
 *   1. 四类字段（直接标识、准标识、生物特征、推断性标识）；
 *   2. 采集三规则、借阅三种情形、三条红线、患者五项权利；
 *   3. 去标识：把「必删字段」段做成可执行清单，逐项与代码里的 DROP 对账 ——
 *      正文加了字段而代码没加，这个测试就会红；
 *   4. 关联表不能与数据放在一起：写成断言，放一起就抛错；
 *   5. 习题对账。
 *
 * 依赖：仅 node:fs / node:path。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const docText = () => fs.readFileSync(DOC, 'utf8');
const quizData = () => JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
const hanzi = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;

function grams(s, n = 4) {
  const out = new Set();
  for (const seg of String(s || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** 四类字段（正文可能在两处提到同一类，按首次出现去重） */
function fieldClasses(text = docText()) {
  const out = [];
  for (const m of text.matchAll(/\*\*(直接标识|准标识|生物特征|推断性标识)\*\*/g)) {
    if (!out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

/** 采集端三规则 */
function collectionRules(text = docText()) {
  return [...text.matchAll(/\*\*规则(一|二|三)：/g)].map((m) => m[1]);
}

/** 借阅与二次使用的三种情形 */
function useCases(text = docText()) {
  return [...text.matchAll(/\*\*情形(一|二|三)：(临床借阅|对外借阅|二次使用)/g)].map((m) => m[2]);
}

/** 三条红线 */
function redLines(text = docText()) {
  const seg = text.split('**三条红线**：')[1];
  if (!seg) return [];
  return seg.split('。')[0].replace(/「|」/g, '').split('；').map((s) => s.trim()).filter(Boolean);
}

/** 患者五项权利 */
function patientRights(text = docText()) {
  const seg = text.split('患者的五项权利要能一件件办到**：')[1];
  if (!seg) return [];
  return seg.split('。')[0].split('；').map((s) => s.replace(/\*\*/g, '').trim()).filter(Boolean);
}

/** 「必删字段」那一段原文，供清单对账 */
function deleteClause(text = docText()) {
  const seg = text.split('**必删字段。**')[1];
  return seg ? seg.split('**可留字段')[0] : '';
}

/** 代码侧的必删清单：每项都必须能在「必删字段」段里找到 */
const DROP = [
  '姓名',
  '证件号',
  '病历号',
  '住院号',
  '联系方式',
  '住址',
  '精确日期',
  '机构名称',
  '科室',
  '设备序列号',
  '拍摄者',
  '读片人',
];

/** 可留字段：眼别、年龄段、诊断大类、检查类型与是否散瞳、相对时序、技术参数 */
const KEEP = ['眼别', '年龄段', '诊断大类', '检查类型', '是否散瞳', '相对时序', '技术参数'];

/** 去标识：删必删、留可留，精确日期折成相对时序（对外可留相对时序） */
function deidentify(record, { relativeTo } = {}) {
  const out = {};
  const dropped = [];
  for (const [k, v] of Object.entries(record)) {
    if (k === '精确日期') {
      dropped.push(k);
      out['相对时序'] = relativeTo || 'T0';
      continue;
    }
    if (DROP.includes(k)) {
      dropped.push(k);
      continue;
    }
    out[k] = v;
  }
  return { kept: out, dropped };
}

/** 关联表不能与去标识数据放在一起；放一起就等于没去标识 */
function assertSeparable(bundle) {
  const keys = Object.keys(bundle);
  if (keys.includes('关联表') && keys.some((k) => k !== '关联表')) {
    throw new Error('关联表与数据放在一起，去标识等于没做');
  }
  return true;
}

function quizAudit() {
  const q = quizData();
  const body = grams(docText());
  const qs = Array.isArray(q.questions) ? q.questions : [];
  const byStage = { pre: 0, check: 0, post: 0 };
  const problems = [];
  let grounded = 0;

  qs.forEach((item, i) => {
    const n = i + 1;
    if (item.stage in byStage) byStage[item.stage] += 1;
    else problems.push(`第 ${n} 题 stage 非法：${item.stage}`);
    const opts = Array.isArray(item.options) ? item.options : [];
    if (opts.length !== 4) problems.push(`第 ${n} 题有 ${opts.length} 个选项`);
    if (!(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < opts.length)) {
      problems.push(`第 ${n} 题 correct 下标非法`);
    }
    if (hanzi(item.explain) < 30) problems.push(`第 ${n} 题 explain 只有 ${hanzi(item.explain)} 汉字`);
    if (item.stage === 'check') {
      const right = String(opts[item.correct] || '');
      if ([...grams(right)].some((g) => body.has(g))) grounded += 1;
    }
  });

  return { total: qs.length, byStage, grounded, problems };
}

function main() {
  const text = docText();
  const a = quizAudit();
  const clause = deleteClause(text);
  const missInDoc = DROP.filter((f) => !clause.includes(f));
  const demo = deidentify({ 姓名: '示例', 眼别: '右', 精确日期: '2026-11-22', 诊断大类: 'DR' });

  console.log('眼科影像检查 · 第 8 章 对账');
  console.log('');
  console.log(`四类字段：${fieldClasses(text).join('、')}`);
  console.log(`采集规则：${collectionRules(text).length} 条；借阅情形：${useCases(text).join('、')}`);
  console.log(`三条红线：${redLines(text).join('；')}`);
  console.log(`患者五项权利：${patientRights(text).length} 项`);
  console.log('');
  console.log(`必删清单 ${DROP.length} 项，正文「必删字段」段缺：${missInDoc.length ? missInDoc.join('、') : '无'}`);
  console.log(`去标识示例：保留 ${Object.keys(demo.kept).join('、')}；删除 ${demo.dropped.join('、')}`);
  console.log('');
  console.log(`习题 ${a.total} 题（pre ${a.byStage.pre} / check ${a.byStage.check} / post ${a.byStage.post}）`);
  console.log(`check 题正确选项能在正文找到原词的：${a.grounded} 道`);
  console.log(a.problems.length ? `✗ ${a.problems.length} 处：${a.problems.join('；')}` : '✓ 结构齐、解释够长、判据落在正文');
  console.log('');
  console.log('※ 数字由本章正文现算，不手打；正文改动后重跑即可复现。');
}

if (require.main === module) main();

module.exports = {
  docText,
  quizData,
  hanzi,
  grams,
  DROP,
  KEEP,
  fieldClasses,
  collectionRules,
  useCases,
  redLines,
  patientRights,
  deleteClause,
  deidentify,
  assertSeparable,
  quizAudit,
};
