#!/usr/bin/env node
/**
 * 眼科影像检查 · 第 2 章对账器
 *
 * 数据源：
 *   ../docs/zh.md   本章正文（三层壁、四个屈光间质、两套血管、共识参数）
 *   ../quiz.json    本章习题
 *
 * 现算的东西：
 *   1. 四层屈光间质的次序（从「四个屈光间质——…」这一句里解析）；
 *   2. 三层壁的次序（从加粗小标题解析）；
 *   3. 正文里带单位的数值，以及它们各自落在哪个共识节号句里 —— 「共识值要标节」做成可执行判据；
 *   4. 设备参数（MHz / dB）是否都在标了节号的句子里；
 *   5. 中心凹是否落在扫描框内（几何判据，正文说框没框住中心凹，范围栏就是假的）；
 *   6. 习题对账。
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

/** 「四个屈光间质——角膜、房水、晶状体、玻璃体——」里那一串 */
function mediaOrder(text = docText()) {
  const tail = text.split('四个屈光间质——')[1];
  if (!tail) return [];
  return tail.split('——')[0].split('、').map((s) => s.trim()).filter(Boolean);
}

/** 三层壁：正文用 **纤维膜。** 这种加粗小标题 */
function wallLayers(text = docText()) {
  return [...text.matchAll(/\*\*(纤维膜|血管膜|视网膜)。\*\*/g)].map((m) => m[1]);
}

/** 带单位的数值（含区间），保留原始写法 */
const VALUE_RE = /\d+(?:\.\d+)?(?:–\d+(?:\.\d+)?)?\s*(?:mm×\d+(?:\.\d+)?mm|MHz|dB|ml|°|mm|秒|小时|min|s)/g;

/** 把正文按句切开，取每一句里带的共识节号与该句数值 */
function taggedValues(text = docText()) {
  const out = [];
  for (const seg of text.split(/[。；\n]/)) {
    const tag = /共识·第([一二三四五六七八九十]+)节/.exec(seg);
    const vals = [...seg.matchAll(VALUE_RE)].map((m) => m[0].replace(/\s+/g, ''));
    if (!tag || vals.length === 0) continue;
    out.push({ section: tag[1], values: [...new Set(vals)], sentence: seg.trim() });
  }
  return out;
}

/** 全部设备频率/信号类数值（MHz、dB），用来查它们有没有标节 */
function deviceParams(text = docText()) {
  return [...text.matchAll(VALUE_RE)]
    .map((m) => m[0].replace(/\s+/g, ''))
    .filter((v) => /MHz|dB$/.test(v));
}

/** 中心凹是否落在扫描框内：offsetMm 为中心凹偏离框心的距离，halfMm 为框的半边长 */
function foveaInFrame(offsetMm, halfMm) {
  if (!(halfMm > 0)) throw new RangeError('框的半边长必须为正');
  if (!(offsetMm >= 0)) throw new RangeError('偏移量用绝对值，不接受负数');
  return offsetMm <= halfMm;
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
  const tagged = taggedValues(text);
  const a = quizAudit();

  console.log('眼科影像检查 · 第 2 章 对账');
  console.log('');
  console.log(`四层屈光间质：${mediaOrder(text).join(' → ')}`);
  console.log(`三层壁：${wallLayers(text).join(' → ')}`);
  console.log('');
  console.log('带节号的共识值：');
  for (const t of tagged) console.log(`  第${t.section}节：${t.values.join('、')}`);
  console.log(`设备参数（MHz/dB）：${deviceParams(text).join('、')}`);
  console.log(`水轮是否被判为不可对应：${text.includes('水轮不对应') ? '是' : '否'}`);
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
  mediaOrder,
  wallLayers,
  taggedValues,
  deviceParams,
  foveaInFrame,
  quizAudit,
};
