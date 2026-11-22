#!/usr/bin/env node
/**
 * 中医机器人学 · 第 7 章 安全不是「不出故障」，是故障之后朝哪个方向倒
 * 课程: departments/07-zhineng/11-zhongyi-jiqiren-xue/chapters/07-rob7/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 延迟预算表逐行读出并求和：不含抱闸 65 ms、含抱闸 100 ms，两条路径的差别就是
 * 「停得多快」与「停完朝哪个方向」的取舍。滤波窗与截止频率按 f_c ≈ 1/(2T) 现算。
 * FMEA 表与停止类别表也从正文读出，用来核对「检测到 ≠ 处理对」的列数。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 7;
const TITLE = '安全不是「不出故障」，是故障之后朝哪个方向倒';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function detex(s) {
  return String(s || '')
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\approx/g, '≈')
    .replace(/\\mu/g, 'μ')
    .replace(/\\max/g, 'max')
    .replace(/\\min/g, 'min')
    .replace(/\\le/g, '≤')
    .replace(/\\ge/g, '≥')
    .replace(/\\left|\\right|\\,|\\;|\\!/g, ' ')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/\\\s/g, ' ')
    .replace(/\\/g, '')
    .replace(/[${}]/g, '');
}

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((s) => s.trim());
}

function parseTables(md) {
  const lines = String(md).split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^\s*\|/.test(lines[i])) continue;
    if (i + 1 >= lines.length || !/^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) continue;
    const header = splitRow(lines[i]);
    const rows = [];
    let j = i + 2;
    while (j < lines.length && /^\s*\|/.test(lines[j])) { rows.push(splitRow(lines[j])); j += 1; }
    out.push({ header, rows });
    i = j - 1;
  }
  return out;
}

function num(s) {
  const m = String(s == null ? '' : s).replace(/[,\s]/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

/** 一阶窗的截止频率近似：f_c ≈ 1/(2T)。 */
function cutoff(tMs) {
  return 1 / (2 * (tMs / 1000));
}

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const flat = detex(body).replace(/\u00a0/g, ' ');
  const tables = parseTables(body);

  // 延迟预算表：环节 / 耗时 / 能否压缩 / 压缩的代价
  const budgetTable = tables.find((t) => t.header.join('').includes('能否压缩'));
  if (!budgetTable) throw new Error('正文里没有延迟预算表');
  const budget = budgetTable.rows.map((r) => ({
    stage: r[0],
    ms: num(r[1]),
    compressible: (r[2] || '').replace(/\*\*/g, ''),
    cost: r[3] || '',
    isBrake: /抱闸/.test(r[0]),
  }));
  const withoutBrake = budget.filter((b) => !b.isBrake);
  const totalWithoutBrake = withoutBrake.reduce((a, b) => a + b.ms, 0);
  const brake = budget.find((b) => b.isBrake);
  const totalWithBrake = totalWithoutBrake + (brake ? brake.ms : 0);

  // 滤波窗与其截止
  const winHit = flat.match(/(\d+)\s*ms 的窗对应约\s*(\d+)\s*Hz 的截止/);
  if (!winHit) throw new Error('正文里没有滤波窗与截止频率的对照');
  const winMs = Number(winHit[1]);
  const winCutDoc = Number(winHit[2]);
  const halfHit = flat.match(/缩到\s*(\d+)\s*ms/);
  const halfMs = halfHit ? Number(halfHit[1]) : winMs / 2;

  // FMEA 表：失效模式 / 检测手段 / 应有响应 / 若响应错误
  const fmeaTable = tables.find((t) => t.header.join('').includes('检测手段'));
  const fmea = fmeaTable ? fmeaTable.rows.map((r) => ({ mode: r[0], detect: r[1], response: r[2], wrong: r[3] })) : [];

  // 停止类别表：类别 / 动作 / 适用 / 后果
  const stopTable = tables.find((t) => t.header.join('').includes('类别'));
  const stops = stopTable ? stopTable.rows.map((r) => ({ cls: r[0], action: r[1], use: r[2], consequence: r[3] })) : [];

  // 冗余判据与「三句不该出现的表述」
  const redundancyRule = /任何冗余，都要问「它自己坏了，怎么知道」/.test(body);
  const badPhrases = [...body.matchAll(/^- \*\*「(.+?)」\*\*/gm)].map((m) => m[1]);

  return {
    body,
    hanzi: (body.match(HANZI) || []).length,
    budget,
    totalWithoutBrake,
    totalWithBrake,
    brakeMs: brake ? brake.ms : null,
    winMs,
    winCutDoc,
    winCutModel: cutoff(winMs),
    halfMs,
    halfCut: cutoff(halfMs),
    fmea,
    stops,
    redundancyRule,
    badPhrases,
    hasTitle: body.startsWith('# 第 ' + CHAPTER + ' 章 · ' + TITLE),
  };
}

function main() {
  const x = analyze(read());
  const f = (n, d = 1) => n.toFixed(d);

  console.log(`中医机器人学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`正文 ${x.hanzi} 汉字 · 失效模式 ${x.fmea.length} 条 · 停止类别 ${x.stops.length} 类`);
  console.log('');
  console.log('一、延迟预算（从「力超限发生」到「力矩归零」）：');
  for (const b of x.budget) {
    console.log(`  ${b.stage}${b.isBrake ? '（可选分支）' : ''}：${b.ms} ms ｜ 能否压缩：${b.compressible} ｜ 代价：${b.cost}`);
  }
  console.log(`  → 不用抱闸：${x.budget.filter((b) => !b.isBrake).map((b) => b.ms).join(' + ')} = ${x.totalWithoutBrake} ms`);
  console.log(`  → 用抱闸：${x.totalWithoutBrake} + ${x.brakeMs} = ${x.totalWithBrake} ms`);
  console.log(`  → 抱闸让停车慢了 ${x.brakeMs} ms，而且方向是「保持」不是「退让」；接触场景该选哪条，是机构层面的事。`);
  console.log('');
  console.log('二、滤波窗与截止（f_c ≈ 1/(2T)）：');
  console.log(`  T = ${x.winMs} ms ⇒ f_c ≈ ${f(x.winCutModel, 0)} Hz（正文写约 ${x.winCutDoc} Hz）`);
  console.log(`  缩到 ${x.halfMs} ms ⇒ f_c ≈ ${f(x.halfCut, 0)} Hz：带宽翻倍，噪声随带宽开根上升（约 ${f(Math.sqrt(x.halfCut / x.winCutModel), 2)} 倍，正文按「大约翻倍」的保守说法），误触发率随之上升。`);
  console.log(`  → 可用性差的安全功能最终会被关掉，这是最真实的失效路径。`);
  console.log('');
  console.log('三、失效模式清单（检测到 ≠ 处理对，第三列才是设计决定）：');
  for (const e of x.fmea) console.log(`  ${e.mode} ｜ 检测：${e.detect} ｜ 应有响应：${e.response} ｜ 若错：${e.wrong}`);
  console.log('');
  console.log('四、停止类别：');
  for (const s of x.stops) console.log(`  ${s.cls}：${s.action} ｜ 适用：${s.use} ｜ 后果：${s.consequence}`);
  console.log('');
  console.log(`五、冗余判据（自己坏了怎么知道）：${x.redundancyRule ? '正文已写明' : '未出现'}`);
  console.log(`   三句不该出现的表述：${x.badPhrases.map((s) => '「' + s + '」').join('、')}`);
  console.log(`   首行章题一致：${x.hasTitle ? '是' : '否'}`);
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本章为功能安全与失效处理的教学讨论，不构成安全标准或合规意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, detex, parseTables, num, cutoff, analyze };
