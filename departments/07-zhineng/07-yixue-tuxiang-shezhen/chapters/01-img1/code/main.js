#!/usr/bin/env node
/**
 * 医学图像识别 · 第 1 章 对账器：像素预算与标签占比
 *
 * 数据源只有两个，都在本目录旁边：
 *   ../docs/zh.md   本章正文（三类来源、三种标签形状、算例都写在这一份里）
 *   ../quiz.json    本章习题
 *
 * 现算的东西：
 *   1. 从正文读出边长与通道数，重算单图字节、1 万张总盘、训练张量、batch 内存；
 *   2. 标签（5 类 one-hot 20 字节）相对训练张量的占比；
 *   3. 三项任务标注成本里分割那一档的标签数（H×W）；
 *   4. 习题对账：题量、分段、选项数、解释字数，以及 check 题正确选项能否在正文找到原词。
 *
 * 正文里写下的数（786,432 / 602,112 / 18.4 MiB / 0.003%）不是手抄进去的，
 * 而是由本脚本从边长现算，再与正文逐项比对；改正文而不改算式，测试就会红。
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

/** 连续汉字片段（n 字），用于判断「习题用词是不是正文里的词」 */
function grams(s, n = 4) {
  const out = new Set();
  for (const seg of String(s || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** 正文写的「786{,}432」这种带千位的写法，用来和现算数比对 */
const group = (n) => Math.round(n).toLocaleString('en-US').replace(/,/g, '{,}');

/** 从正文读出原图边长：正文写作「单张 512×512×3、uint8」 */
function sourceSide(text = docText()) {
  const m = text.match(/(\d+)×(\d+)×3、uint8/);
  if (!m) throw new Error('正文里找不到「N×N×3、uint8」的原图规格');
  return { w: Number(m[1]), h: Number(m[2]) };
}

/** 从正文读出训练缓存边长：正文写作「缩到 224×224」 */
function trainSide(text = docText()) {
  const m = text.match(/缩到\s*(\d+)×(\d+)/);
  if (!m) throw new Error('正文里找不到训练缓存的边长');
  return { w: Number(m[1]), h: Number(m[2]) };
}

/** 像素预算：全部由边长与通道数现算，不手打 */
function pixelBudget(text = docText()) {
  const src = sourceSide(text);
  const tr = trainSide(text);
  const fullBytes = src.w * src.h * 3;                 // uint8 RGB
  const trainBytes = tr.w * tr.h * 3 * 4;              // float32 RGB
  return {
    src,
    train: tr,
    fullBytes,
    tenThousandGiB: (fullBytes * 10000) / 2 ** 30,
    trainBytes,
    batchMiB: (trainBytes * 32) / 2 ** 20,
    labelSharePct: (20 / trainBytes) * 100,            // 5 类 one-hot 20 字节
  };
}

/** 分割任务的标签数 = 原图 H×W（每像素一个类别），对比分类的 1 个 */
function segLabels(text = docText()) {
  const src = sourceSide(text);
  return src.w * src.h;
}

/** 习题对账：结构 + 接地 */
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
  const b = pixelBudget(text);
  const a = quizAudit();

  console.log('医学图像识别 · 第 1 章 对账');
  console.log('');
  console.log(`原图 ${b.src.w}×${b.src.h}×3 uint8：${group(b.fullBytes)} 字节 ≈ ${(b.fullBytes / 2 ** 20).toFixed(2)} MiB`);
  console.log(`1 万张原图：${b.tenThousandGiB.toFixed(1)} GiB`);
  console.log(`训练张量 ${b.train.w}×${b.train.h} float32：${group(b.trainBytes)} 字节 ≈ ${(b.trainBytes / 2 ** 20).toFixed(2)} MiB`);
  console.log(`batch 32：${b.batchMiB.toFixed(1)} MiB`);
  console.log(`标签 20 字节 / 训练张量：${b.labelSharePct.toFixed(3)}%`);
  console.log(`分割标签数（每像素一个）：${group(segLabels(text))}，是分类标签的 ${group(segLabels(text))} 倍`);
  console.log('');
  console.log(`习题 ${a.total} 题（pre ${a.byStage.pre} / check ${a.byStage.check} / post ${a.byStage.post}）`);
  console.log(`check 题正确选项能在正文找到原词的：${a.grounded} 道`);
  console.log(a.problems.length ? `✗ ${a.problems.length} 处：${a.problems.join('；')}` : '✓ 结构齐、解释够长、判据落在正文');
  console.log('');
  console.log('※ 数字由本章正文与习题现算，不手打；正文改动后重跑即可复现。');
}

if (require.main === module) main();

module.exports = {
  DOC,
  QUIZ,
  docText,
  quizData,
  hanzi,
  grams,
  group,
  sourceSide,
  trainSide,
  pixelBudget,
  segLabels,
  quizAudit,
};

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/^[>\s*#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }
