#!/usr/bin/env node
/**
 * 医学图像识别 · 第 9 章 对账器：遮挡检验与热图的分辨率假象
 *
 * 数据源：
 *   ../docs/zh.md   本章正文（显著性定义、三种误读、三个检验、用途与免责）
 *   ../quiz.json    本章习题
 *
 * 现算的东西：
 *   1. 从正文读出 8×8 网格与每次遮挡的块数，算出遮挡步数；
 *   2. 从遮挡表读出三组置信度下降（42/12/4），算高显著相对随机的倍数；
 *   3. 「解释有效」的判据：删高显著区必须掉得比随机快；
 *   4. 类激活图上采样的倍率（7×7 → 224×224），说明红块边缘是插值；
 *   5. 习题对账：结构、分段、解释字数、check 题接地。
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

const pick = (text, re, what) => {
  const m = text.match(re);
  if (!m) throw new Error(`正文里找不到${what}`);
  return m;
};

/** 遮挡网格：8×8 共 64 块，每次遮 5 块 */
function occlusionGrid(text = docText()) {
  const m = pick(text, /(\d+)×(\d+) 网格（(\d+) 块），每次遮 (\d+) 块/, '遮挡网格');
  const cells = Number(m[3]);
  const perStep = Number(m[4]);
  return {
    w: Number(m[1]),
    h: Number(m[2]),
    cells,
    perStep,
    steps: Math.ceil(cells / perStep),
    consistent: Number(m[1]) * Number(m[2]) === cells,
  };
}

/** 删除曲线的三组下降：高显著 / 随机 / 低显著 */
function deletionCurve(text = docText()) {
  const high = pick(text, /显著性最高的\s*(\d+)\s*块\s*\|\s*(\d+)%/, '高显著组的下降');
  const rand = pick(text, /随机\s*(\d+)\s*块\s*\|\s*(\d+)%/, '随机组的下降');
  const low = pick(text, /显著性最低的\s*(\d+)\s*块\s*\|\s*(\d+)%/, '低显著组的下降');
  const g = {
    blocks: Number(high[1]),
    high: Number(high[2]),
    random: Number(rand[2]),
    low: Number(low[2]),
  };
  return {
    ...g,
    ratio: g.high / g.random,
    ordered: g.high > g.random && g.random > g.low,
    informative: g.high >= 2 * g.random,
  };
}

/** 类激活图上采样：7×7 → 224×224 只是插值 */
function upsample(text = docText()) {
  const m = pick(text, /分辨率等于最后特征图的尺寸（如\s*(\d+)×(\d+)），上采样到\s*(\d+)×(\d+)/, '类激活图与输入尺寸');
  const src = Number(m[1]);
  const dst = Number(m[3]);
  if (Number(m[2]) !== src || Number(m[4]) !== dst) throw new Error('正文里的上采样尺寸不成正方形');
  return { src, dst, factor: dst / src, srcCells: src * src, dstCells: dst * dst };
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
  const g = occlusionGrid(text);
  const d = deletionCurve(text);
  const u = upsample(text);
  const a = quizAudit();

  console.log('医学图像识别 · 第 9 章 对账');
  console.log('');
  console.log(`遮挡网格 ${g.w}×${g.h} = ${g.cells} 块（自洽 ${g.consistent}），每次 ${g.perStep} 块 → ${g.steps} 步`);
  console.log(`删除曲线（每次遮 ${d.blocks} 块）：`);
  console.log(`  显著性最高 ${d.high}% / 随机 ${d.random}% / 最低 ${d.low}%`);
  console.log(`  高显著是随机的 ${d.ratio.toFixed(1)} 倍；单调 ${d.ordered}；有信息量 ${d.informative}`);
  console.log('');
  console.log(`类激活图 ${u.src}×${u.src}（${u.srcCells} 格）上采样到 ${u.dst}×${u.dst}（${u.dstCells} 格），倍率 ${u.factor}×`);
  console.log(`  → 红块边缘精确到像素，是插值造出来的假象，不能当病灶边界`);
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
  occlusionGrid,
  deletionCurve,
  upsample,
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
