#!/usr/bin/env node
/**
 * 医学图像识别 · 第 4 章 对账器：感受野、参数量与分割指标
 *
 * 数据源：
 *   ../docs/zh.md   本章正文（卷积三假设、感受野递推表、Dice/IoU 算例、迁移表）
 *   ../quiz.json    本章习题
 *
 * 现算的东西：
 *   1. 从正文那张六层表的 k 与 s 逐层递推感受野 RF 与跳距 J，与表格自报值逐行比对；
 *   2. 三层 3×3 与一层 7×7 的参数量（正文的 110,784 与 200,768）；
 *   3. Dice、IoU 与像素准确率（真值 1,000 / 预测 900 / 交集 800）；
 *   4. Dice 与 IoU 的单调对应关系；
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

const group = (n) => Math.round(n).toLocaleString('en-US').replace(/,/g, '{,}');

/** 逐层递推：RF_l = RF_{l-1} + (k_l - 1)·J_{l-1}，J_l = J_{l-1}·s_l */
function receptiveFields(layers) {
  let rf = 1;
  let j = 1;
  return layers.map((l) => {
    rf += (l.k - 1) * j;
    j *= l.s;
    return { ...l, rf, j };
  });
}

/** 从正文的六层表解析 k / s 与表格自报的 RF、J */
function layerTable(text = docText()) {
  const head = text.indexOf('| 层 | 类型');
  if (head < 0) throw new Error('正文里找不到感受野表头');
  const seg = text.slice(head, text.indexOf('六层之后', head));
  const rows = [...seg.matchAll(/\|\s*(\d+)\s*\|\s*(\w+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/g)]
    .map((m) => ({
      n: Number(m[1]),
      type: m[2],
      k: Number(m[3]),
      s: Number(m[4]),
      rfClaim: Number(m[5]),
      jClaim: Number(m[6]),
    }));
  if (!rows.length) throw new Error('感受野表没解析出任何一行');
  return rows.map((r, i, all) => ({ ...r, ...receptiveFields(all)[i] }));
}

/** 三层 3×3（C 通道）与一层 7×7 的参数量 */
function convParams(text = docText()) {
  const m = text.match(/9\\times64\\times64\+64/);
  if (!m) throw new Error('正文里找不到 64 通道的 3×3 卷积写法');
  const C = 64;
  const threeByThree = 3 * (9 * C * C + C);
  const oneBySeven = 49 * C * C + C;
  return { C, threeByThree, oneBySeven, ratio: oneBySeven / threeByThree };
}

/** Dice / IoU / 像素准确率：全部由三个像素数现算 */
function segScores(text = docText()) {
  const m = text.match(/真值舌体\s*([\d,]+)\s*像素，预测\s*(\d+)\s*像素，交集\s*(\d+)\s*像素/);
  if (!m) throw new Error('正文里找不到分割算例的三个像素数');
  const gt = Number(m[1].replace(/,/g, ''));
  const pred = Number(m[2]);
  const inter = Number(m[3]);
  const total = Number((text.match(/全图\s*([\d,]+)\s*像素/) || [])[1].replace(/,/g, ''));
  const dice = (2 * inter) / (gt + pred);
  const iou = inter / (gt + pred - inter);
  const correct = inter + (total - pred - gt + inter);
  return { gt, pred, inter, total, dice, iou, pixelAcc: correct / total, correct };
}

/** Dice 与 IoU 的单调对应：Dice = 2IoU/(1+IoU) */
const diceFromIou = (iou) => (2 * iou) / (1 + iou);

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
  const rows = layerTable(text);
  const p = convParams(text);
  const s = segScores(text);
  const a = quizAudit();

  console.log('医学图像识别 · 第 4 章 对账');
  console.log('');
  console.log('感受野逐层递推（现算 vs 表格自报）：');
  for (const r of rows) {
    const ok = r.rf === r.rfClaim && r.j === r.jClaim ? '✓' : '✗';
    console.log(`  L${r.n} ${r.type.padEnd(7)} k=${r.k} s=${r.s} → RF ${r.rf}（表 ${r.rfClaim}）J ${r.j}（表 ${r.jClaim}）${ok}`);
  }
  console.log('');
  console.log(`参数量：三层 3×3 = ${group(p.threeByThree)}；一层 7×7 = ${group(p.oneBySeven)}（${p.ratio.toFixed(2)} 倍）`);
  console.log('');
  console.log(`分割算例：真值 ${s.gt}、预测 ${s.pred}、交集 ${s.inter}`);
  console.log(`Dice = ${s.dice.toFixed(3)}；IoU = ${s.iou.toFixed(3)}；由 IoU 反算 Dice = ${diceFromIou(s.iou).toFixed(3)}`);
  console.log(`像素准确率 = ${(s.pixelAcc * 100).toFixed(2)}%（正确 ${s.correct} / 全图 ${s.total}）`);
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
  receptiveFields,
  layerTable,
  convParams,
  segScores,
  diceFromIou,
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
