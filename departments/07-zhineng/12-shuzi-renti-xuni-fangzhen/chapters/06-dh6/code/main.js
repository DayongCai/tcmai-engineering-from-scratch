#!/usr/bin/env node
/**
 * 数字人体虚拟仿真 · 第 6 章 收敛只证明方程被解对了，不证明方程是对的
 * 课程: departments/07-zhineng/12-shuzi-renti-xuni-fangzhen/chapters/06-dh6/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的薄壁圆筒应力、壁厚敏感性表与不确定度对比都从正文现算：
 * 读正文给出的压力、半径、壁厚与两档误差，按环向应力关系复算应力与相对偏差，
 * 再比较「壁厚测量不确定度」与「离散误差」谁才是决定项。
 * 本章的判断：收敛只约束离散误差，确认要与独立实验对照。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 6;
const TITLE = '收敛只证明方程被解对了，不证明方程是对的';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function readDoc() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

/** 把 LaTeX 小命令洗掉，便于从正文里取数。 */
function normalize(text) {
  return String(text)
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\[,;:]|\\\s/g, ' ')
    .replace(/\$/g, ' ')
    .replace(/\\/g, ' ');
}

function pick(text, re, label) {
  const m = normalize(text).match(re) || String(text).match(re);
  if (!m) throw new Error('正文里没找到' + label + '，正则需随正文一起改: ' + re);
  return m;
}

/** 正文设定：压力、半径、壁厚、壁厚不确定度、两档误差。 */
function settings(text) {
  return {
    pKpa: Number(pick(text, /([\d.]+)\s*kPa/, '压力（kPa）')[1]),
    rMm: Number(pick(text, /r\s*=\s*([\d.]+)\s*mm/, '半径')[1]),
    tMm: Number(pick(text, /t\s*=\s*([\d.]+)\s*mm/, '壁厚')[1]),
    dtMm: Number(pick(text, /±([\d.]+)\s*mm/, '壁厚不确定度')[1]),
    discretePct: Number(pick(text, /再加密到\s*0\.5\s*mm，只变\s*([\d.]+)%/, '细网格后的相对变化')[1]),
    spreadPct: Number(pick(text, /离散度本身就有约\s*(\d+)%/, '样本间离散度')[1]),
  };
}

/** 壁厚敏感性表：三行壁厚与对应应力、相对基准。 */
function table(text) {
  const out = [];
  for (const line of String(text).split('\n')) {
    const m = line.match(/^\|\s*([\d.]+)\s*mm\s*\|\s*([\d.]+)\s*MPa\s*\|\s*([^|]+?)\s*\|\s*$/);
    if (!m) continue;
    out.push({ tMm: Number(m[1]), stressMpa: Number(m[2]), stated: m[3] });
  }
  if (out.length !== 3) throw new Error('壁厚敏感性表应有三行，实得 ' + out.length);
  return out;
}

/** 薄壁圆筒环向应力 σ = pr/t（单位统一到 SI 后换算成 MPa）。 */
function hoopStressMpa(pKpa, rMm, tMm) {
  return (pKpa * 1e3 * (rMm / 1e3)) / (tMm / 1e3) / 1e6;
}

function compute(text) {
  const s = settings(text);
  const base = hoopStressMpa(s.pKpa, s.rMm, s.tMm);
  const rows = table(text).map((row) => ({
    ...row,
    computed: hoopStressMpa(s.pKpa, s.rMm, row.tMm),
    deltaPct: (hoopStressMpa(s.pKpa, s.rMm, row.tMm) / base - 1) * 100,
  }));
  const dtPct = (s.dtMm / s.tMm) * 100;
  return {
    ...s,
    base,
    rows,
    dtPct,
    stressSwingPct: Math.abs(rows[0].deltaPct),
    ratioToDiscrete: Math.abs(rows[0].deltaPct) / s.discretePct,
    spreadRatio: s.spreadPct / s.discretePct,
    hanzi: (text.match(HANZI) || []).length,
  };
}

function checks(text) {
  const c = compute(text);
  const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-9);
  return [
    {
      name: '基准环向应力按 pr/t 复算',
      ok: rel(c.base, 0.133) < 0.01,
      note: `${c.pKpa} kPa × ${c.rMm} mm ÷ ${c.tMm} mm = ${c.base.toFixed(4)} MPa（正文 0.133 MPa）`,
    },
    {
      name: '壁厚敏感性表三行都能复算',
      ok: c.rows.every((r) => rel(r.computed, r.stressMpa) < 0.01),
      note: c.rows.map((r) => `t=${r.tMm}: ${r.computed.toFixed(3)}（正文 ${r.stressMpa}）`).join('；'),
    },
    {
      name: '相对基准的偏差方向与数值',
      ok: Math.abs(c.rows[0].deltaPct - 11) < 1 && Math.abs(c.rows[2].deltaPct + 9) < 1,
      note: `t−10% → ${c.rows[0].deltaPct.toFixed(0)}%；t+10% → ${c.rows[2].deltaPct.toFixed(0)}%`,
    },
    {
      name: '壁厚不确定度是离散误差的十倍量级',
      ok: c.ratioToDiscrete > 8 && c.ratioToDiscrete < 15 && Math.abs(c.stressSwingPct / 1 - 11) < 1,
      note: `应力摆幅 ${c.stressSwingPct.toFixed(0)}% ÷ 离散误差 ${c.discretePct}% ≈ ${c.ratioToDiscrete.toFixed(1)} 倍；按 1% 口径约 ${(c.stressSwingPct / 1).toFixed(0)} 倍，与正文「十倍」同量级`,
    },
    {
      name: '样本间离散度压过离散误差',
      ok: c.spreadRatio > 20,
      note: `个体变异 ${c.spreadPct}% ÷ 离散误差 ${c.discretePct}% = ${c.spreadRatio.toFixed(0)} 倍：验证要跨的是前者`,
    },
    {
      name: '壁厚测量本身的相对不确定度',
      ok: Math.abs(c.dtPct - 10) < 0.5,
      note: `±${c.dtMm} mm ÷ ${c.tMm} mm = ${c.dtPct.toFixed(0)}%，与正文所写的一成相符`,
    },
  ];
}

function report() {
  const text = readDoc();
  const c = compute(text);
  console.log(`数字人体虚拟仿真 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('');
  console.log(`正文 ${c.hanzi.toLocaleString('en-US')} 汉字；p=${c.pKpa} kPa、r=${c.rMm} mm、t=${c.tMm} mm。`);
  console.log('');
  console.log('一、薄壁圆筒的环向应力（可纸笔核对）');
  console.log(`  σ = pr/t = ${c.base.toFixed(4)} MPa`);
  console.log('');
  console.log('二、壁厚敏感性（正文表格逐行读出并复算）');
  for (const r of c.rows) {
    console.log(`  t=${r.tMm} mm → ${r.computed.toFixed(3)} MPa，相对基准 ${r.deltaPct >= 0 ? '+' : ''}${r.deltaPct.toFixed(0)}%（正文 ${r.stated}）`);
  }
  console.log('');
  console.log('三、谁才是决定项');
  console.log(`  壁厚 ±${c.dtPct.toFixed(0)}% → 应力约 ±${c.stressSwingPct.toFixed(0)}%，是离散误差 ${c.discretePct}% 的 ${c.ratioToDiscrete.toFixed(1)} 倍`);
  console.log(`  个体变异 ${c.spreadPct}% 是离散误差的 ${c.spreadRatio.toFixed(0)} 倍：验证的门槛在对照数据，不在网格`);
  console.log('');
  console.log('四、逐条对照正文数字');
  let bad = 0;
  for (const k of checks(text)) {
    console.log(`  ${k.ok ? '✓' : '✗'} ${k.name}：${k.note}`);
    if (!k.ok) bad += 1;
  }
  console.log('');
  console.log(bad ? `✗ ${bad} 条与正文不一致，正文或脚本需要同步。` : '✓ 全部对上：应力与不确定度都由正文设定现算。');
  console.log('※ 教学样例：压力、半径与壁厚按正文演算设定现算，不对应任何实验或模型。');
  console.log('※ 本章不给通用确认容差，仿真结果支撑临床决策须经独立验证与主管部门审评。');
  return bad;
}

if (require.main === module) process.exitCode = report() ? 1 : 0;

module.exports = { readDoc, normalize, settings, table, hoopStressMpa, compute, checks, report, DOC, CHAPTER, TITLE };
