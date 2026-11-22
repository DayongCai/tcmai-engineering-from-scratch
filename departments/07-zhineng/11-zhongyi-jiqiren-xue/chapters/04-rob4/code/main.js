#!/usr/bin/env node
/**
 * 中医机器人学 · 第 4 章 接触式任务的规划，不能只算「怎么过去」，要算「怎么压下去」
 * 课程: departments/07-zhineng/11-zhongyi-jiqiren-xue/chapters/04-rob4/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 两张预算都从正文现算：曲率表逐行读出曲率半径，再用 ω = v/R、a_n = v²/R 复算；
 * 切向预算用 |F_t| ≤ μF_n 与 a_t = F_t/m 复算，并把最不利 μ 的单列出来。
 * v、μ、F_n、m 全部来自正文的演算设定。手打的数字会在改稿后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 4;
const TITLE = '接触式任务的规划，不能只算「怎么过去」，要算「怎么压下去」';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function detex(s) {
  return String(s || '')
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\max/g, 'max')
    .replace(/\\min/g, 'min')
    .replace(/\\mu/g, 'μ')
    .replace(/\\gamma/g, 'γ')
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

/** 圆弧：角速度 v/R，法向加速度 v²/R。 */
function arc(v, r) {
  return { omega: v / r, normalAccel: (v * v) / r };
}

/** 接触力预算：切向上限 μF_n，扣除后允许的切向加速度 F_t/m。 */
function frictionBudget(mu, fn, m) {
  const ftMax = mu * fn;
  return { ftMax, atMax: ftMax / m };
}

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const flat = detex(body).replace(/\u00a0/g, ' ');
  const tables = parseTables(body);

  const vHit = flat.match(/(?:^|[^a-z])v\s*=\s*(\d+(?:\.\d+)?)\s*m\/s/);
  if (!vHit) throw new Error('正文里没有末端线速度的演算设定');
  const v = Number(vHit[1]);

  const muHit = flat.match(/μ\s*=\s*(\d+(?:\.\d+)?)/);
  const fnHit = flat.match(/F_n\s*=\s*(\d+(?:\.\d+)?)/);
  const mHit = flat.match(/(?:^|[^a-z])m\s*=\s*(\d+(?:\.\d+)?)\s*kg/);
  if (!muHit || !fnHit || !mHit) throw new Error('正文里没有 μ / F_n / m 的演算设定');
  const mu = Number(muHit[1]);
  const fn = Number(fnHit[1]);
  const m = Number(mHit[1]);
  const budget = frictionBudget(mu, fn, m);

  // 最不利 μ（正文：μ 从 0.4 掉到 0.15）
  const muAltHit = flat.match(/μ\s*从\s*(\d+(?:\.\d+)?)\s*掉到\s*(\d+(?:\.\d+)?)/);
  const muAlt = muAltHit ? Number(muAltHit[2]) : null;
  const budgetAlt = muAlt == null ? null : frictionBudget(muAlt, fn, m);

  // 曲率表：曲率半径 / 角速度 / 法向加速度 / 工程含义
  const curveTable = tables.find((t) => t.header.join('').includes('曲率半径'));
  if (!curveTable) throw new Error('正文里没有曲率表');
  const curve = curveTable.rows.map((r) => {
    const radius = num(r[0]);
    const model = arc(v, radius);
    return {
      radius,
      note: r[3] || '',
      doc: { omega: num(r[1]), normalAccel: num(r[2]) },
      model,
      omegaResidual: Math.abs(model.omega - num(r[1])),
      accelResidual: Math.abs(model.normalAccel - num(r[2])),
    };
  });

  // 三层架构表：安全层 / 规则层 / 优化层
  const layerTable = tables.find((t) => t.header.join('').includes('能否学习'));
  const layers = layerTable ? layerTable.rows.map((r) => ({ name: r[0], content: r[1], owner: r[2], learnable: r[3], cost: r[4] })) : [];

  // 规划器三个失效场景
  const failures = [...body.matchAll(/\*\*场景([一二三])：/g)].length;

  return {
    body,
    hanzi: (body.match(HANZI) || []).length,
    v,
    mu,
    fn,
    m,
    ftMax: budget.ftMax,
    atMax: budget.atMax,
    muAlt,
    ftMaxAlt: budgetAlt ? budgetAlt.ftMax : null,
    atMaxAlt: budgetAlt ? budgetAlt.atMax : null,
    curve,
    layers,
    failures,
    hasTitle: body.startsWith('# 第 ' + CHAPTER + ' 章 · ' + TITLE),
  };
}

function main() {
  const x = analyze(read());
  const f = (n, d = 2) => n.toFixed(d);

  console.log(`中医机器人学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`正文 ${x.hanzi} 汉字 · 规划层 ${x.layers.length} 层 · 失效场景 ${x.failures} 个`);
  console.log('');
  console.log(`一、几何→关节（v = ${x.v} m/s）：`);
  for (const c of x.curve) {
    console.log(
      `  R=${String(c.radius).padEnd(6)} ω=${f(c.model.omega, 2).padStart(6)} rad/s（表内 ${c.doc.omega}）` +
      ` · a_n=${f(c.model.normalAccel, 3).padStart(7)} m/s²（表内 ${c.doc.normalAccel}） ｜ ${c.note}`,
    );
  }
  const worstOmega = x.curve.reduce((a, b) => (b.omegaResidual > a.omegaResidual ? b : a));
  console.log(`  → 最大角速度核对偏差 ${f(worstOmega.omegaResidual, 3)} rad/s（R=${worstOmega.radius}），表内为四舍五入值。`);
  console.log(`  → 曲率半径从 ${x.curve[0].radius} 缩到 ${x.curve[x.curve.length - 1].radius}（${(x.curve[0].radius / x.curve[x.curve.length - 1].radius).toFixed(0)} 倍），角速度从 ${f(x.curve[0].model.omega)} 涨到 ${f(x.curve[x.curve.length - 1].model.omega)}——手法越「细」，要的是带宽不是精度。`);
  console.log('');
  console.log(`二、接触力预算（μ = ${x.mu}，F_n = ${x.fn} N，m = ${x.m} kg）：`);
  console.log(`  |F_t| ≤ μF_n = ${x.mu} × ${x.fn} = ${f(x.ftMax, 1)} N`);
  console.log(`  a_t ≤ F_t/m = ${f(x.ftMax, 1)} / ${x.m} = ${f(x.atMax, 1)} m/s²`);
  if (x.muAlt != null) {
    console.log(`  最不利 μ = ${x.muAlt}：切向余量只剩 ${f(x.ftMaxAlt, 1)} N（a_t ≤ ${f(x.atMaxAlt, 1)} m/s²），所以要按最不利 μ 的一半做设计。`);
  }
  console.log(`  → 切向力不超上限只保证「不整体滑移」，不保证「皮肤不被牵拉」；判据应是剪切变形，不是摩擦系数。`);
  console.log('');
  console.log(`三、三层架构 ${x.layers.length} 层：`);
  for (const l of x.layers) console.log(`  ${l.name}：${l.content} ｜ 谁定：${l.owner} ｜ 能否学习：${l.learnable.replace(/\*\*/g, '')}`);
  console.log('');
  console.log(`四、规划器失效场景 ${x.failures} 个（奇异位形抖动 / 接触后重规划 / 多约束不可满足）；首行章题一致：${x.hasTitle ? '是' : '否'}`);
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本章为运动规划与规则约束的教学讨论，不构成设备设计规范或临床操作规范。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, detex, parseTables, num, arc, frictionBudget, analyze };
