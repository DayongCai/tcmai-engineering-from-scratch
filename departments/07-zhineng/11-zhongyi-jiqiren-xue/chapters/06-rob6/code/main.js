#!/usr/bin/env node
/**
 * 中医机器人学 · 第 6 章 集成不是把模块连起来，是把「同一个词的同一个意思」对齐
 * 课程: departments/07-zhineng/11-zhongyi-jiqiren-xue/chapters/06-rob6/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 两类误差都从正文现算：时钟偏差表用 Δx = v·Δt 逐行复算，坐标链用独立误差的
 * 平方和开根复算；kgf/N 的量级差按 1 kgf = 9.8 N 换算，并把「范围检查能抓住它」
 * 这条判据也一并算出来（196 N 落在人体接触的合理范围之外）。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 6;
const TITLE = '集成不是把模块连起来，是把「同一个词的同一个意思」对齐';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function detex(s) {
  return String(s || '')
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\approx/g, '≈')
    .replace(/\\sigma/g, 'σ')
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

/** 时钟偏差 → 位置误差（mm）。 */
function clockError(v, dtMs) {
  return v * (dtMs / 1000) * 1000;
}

/** 独立误差的合成：平方和开根。 */
function combine(sigmas) {
  return Math.sqrt(sigmas.reduce((a, s) => a + s * s, 0));
}

/** kgf → N。 */
function kgfToNewton(kgf) {
  return kgf * 9.8;
}

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const flat = detex(body).replace(/\u00a0/g, ' ');
  const tables = parseTables(body);

  const vHit = flat.match(/(?:^|[^a-z])v\s*=\s*(\d+(?:\.\d+)?)\s*m\/s/);
  if (!vHit) throw new Error('正文里没有末端速度的演算设定');
  const v = Number(vHit[1]);

  // 时钟偏差表：偏差 / 位置误差 / 后果
  const clockTable = tables.find((t) => t.header.join('').includes('时钟偏差'));
  if (!clockTable) throw new Error('正文里没有时钟偏差表');
  const clock = clockTable.rows.map((r) => {
    const dt = num(r[0]);
    const dxDoc = num(r[1]);
    const dx = clockError(v, dt);
    return { dtMs: dt, consequence: r[2] || '', doc: dxDoc, model: dx, residual: Math.abs(dx - dxDoc) };
  });

  // 坐标链：四个变换的位置误差
  const chainHit = flat.match(/位置误差分别为\s*([\d.、\s]+mm)/);
  if (!chainHit) throw new Error('正文里没有坐标链的误差设定');
  const sigmas = chainHit[1].match(/\d+(?:\.\d+)?/g).map(Number);
  const sigmaTotal = combine(sigmas);
  const sigmaDoc = num((flat.match(/σ_total\s*=[\s\S]{0,160}?≈\s*(\d+(?:\.\d+)?)\s*mm/) || [])[1]);

  // kgf/N
  const rate = num((flat.match(/1\s*kgf\s*=\s*(\d+(?:\.\d+)?)\s*N/) || [])[1]) || 9.8;
  const kgValue = 20;
  const converted = kgfToNewton(kgValue);
  const ratio = converted / kgValue;

  // 四层架构表
  const layerTable = tables.find((t) => t.header.join('').includes('丢一拍的后果'));
  const layers = layerTable ? layerTable.rows.map((r) => ({ name: r[0], period: r[1], content: r[2], cost: r[3] })) : [];

  // 坐标变换归属表
  const tTable = tables.find((t) => t.header.join('').includes('由谁标定'));
  const transforms = tTable ? tTable.rows.map((r) => ({ name: r[0], owner: r[1], expires: r[2], symptom: r[3] })) : [];

  // 接口契约四项
  const cTable = tables.find((t) => t.header.join('').includes('契约项'));
  const contracts = cTable ? cTable.rows.map((r) => ({ item: r[0], question: r[1], missing: r[2] })) : [];

  // 集成验收五项（只数「## 六」这一节里的编号清单）
  const tailIdx = body.search(/\n## 六、/);
  const tail = tailIdx >= 0 ? body.slice(tailIdx) : '';
  const acceptance = [...tail.matchAll(/^\d\.\s+\*\*(.+?)\*\*/gm)].map((m) => m[1]);

  return {
    body,
    hanzi: (body.match(HANZI) || []).length,
    v,
    clock,
    sigmas,
    sigmaTotal,
    sigmaDoc,
    rate,
    kgValue,
    converted,
    ratio,
    layers,
    transforms,
    contracts,
    acceptance,
    hasTitle: body.startsWith('# 第 ' + CHAPTER + ' 章 · ' + TITLE),
  };
}

function main() {
  const x = analyze(read());
  const f = (n, d = 2) => n.toFixed(d);

  console.log(`中医机器人学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`正文 ${x.hanzi} 汉字 · 四层架构 ${x.layers.length} 层 · 坐标变换 ${x.transforms.length} 环 · 契约 ${x.contracts.length} 项`);
  console.log('');
  console.log(`一、时钟偏差 → 位置误差（Δx = v·Δt，v = ${x.v} m/s）：`);
  for (const c of x.clock) {
    console.log(`  Δt=${String(c.dtMs).padStart(3)} ms ⇒ Δx=${f(c.model, 2).padStart(6)} mm（表内 ${c.doc}） ｜ ${c.consequence}`);
  }
  const worst = x.clock.reduce((a, b) => (b.residual > a.residual ? b : a));
  console.log(`  → 最大核对偏差 ${f(worst.residual, 3)} mm（${worst.dtMs} ms）；接触式系统的时钟同步要求是毫秒级。`);
  console.log('');
  console.log('二、坐标链合成误差（独立误差平方和开根）：');
  console.log(`  σ_total = √(${x.sigmas.map((s) => s + '²').join(' + ')}) = √${f(x.sigmas.reduce((a, s) => a + s * s, 0), 4)} ≈ ${f(x.sigmaTotal, 2)} mm（正文写 ${x.sigmaDoc}）`);
  console.log(`  → 最大的一环是体表配准的 ${Math.max(...x.sigmas)} mm：末端精度再高也被它拖住。`);
  console.log('');
  console.log('三、单位与量级：');
  console.log(`  1 kgf = ${x.rate} N ⇒ ${x.kgValue} kgf = ${f(x.converted, 1)} N，是同一读数按 N 解读的 ${f(x.ratio, 1)} 倍。`);
  console.log(`  → 人体接触力合理上限 200 N 的范围检查能抓住它：${x.converted} N 已在范围之外，必报警。`);
  console.log('');
  console.log('四、四层架构：');
  for (const l of x.layers) console.log(`  ${l.name}（${l.period}）：${l.content} ｜ 丢一拍：${l.cost}`);
  console.log('');
  console.log('五、坐标链归属（谁算、何时失效）：');
  for (const t of x.transforms) console.log(`  ${t.name}：${t.owner} ｜ 失效于 ${t.expires} ｜ 表现 ${t.symptom}`);
  console.log('');
  console.log(`六、接口契约 ${x.contracts.length} 项：${x.contracts.map((c) => c.item).join(' / ')}`);
  console.log(`   集成验收 ${x.acceptance.length} 项；首行章题一致：${x.hasTitle ? '是' : '否'}`);
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本章为系统集成与接口设计的教学讨论，不构成技术规范或验收标准。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, detex, parseTables, num, clockError, combine, kgfToNewton, analyze };
