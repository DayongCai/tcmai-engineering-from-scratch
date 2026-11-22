#!/usr/bin/env node
/**
 * 数字人体虚拟仿真 · 第 2 章 数据不是「采得越细越好」，而是「这一层问题配这一层数据」
 * 课程: departments/07-zhineng/12-shuzi-renti-xuni-fangzhen/chapters/02-dh2/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的体素各向异性、重采样倍数与配准残差全部从正文现算：
 * 读正文写下的体素尺寸与标记点分配，复算体素体积、采样密度比、方程数与留出点残差比，
 * 逐条与正文数字对照。本章的判断：每一类数据都有自己的物理上限，先问这层数据能回答什么。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 2;
const TITLE = '数据不是「采得越细越好」，而是「这一层问题配这一层数据」';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function readDoc() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function pick(text, re, label) {
  const m = String(text).match(re);
  if (!m) throw new Error('正文里没找到' + label + '，正则需随正文一起改: ' + re);
  return m;
}

/** 正文写下的设定：体素尺寸、重采样目标、标记点分配与两次残差。 */
function settings(text) {
  const v = pick(text, /(\d+\.\d+)\s*×\s*(\d+\.\d+)\s*×\s*(\d+\.\d+)\s*mm/, '各向异性体素尺寸');
  const r = pick(text, /(\d+)\s*个标记点，\s*(\d+)\s*个求变换、\s*(\d+)\s*个检验，\s*留出点 RMS\s*([\d.]+)\s*mm/, '配准标记点分配');
  const f = pick(text, /1\/0\.5\)\^3\s*=\s*(\d+)/, '重采样倍数');
  const t = pick(text, /训练残差降到\s*([\d.]+)\s*mm/, '训练残差');
  return {
    voxel: [Number(v[1]), Number(v[2]), Number(v[3])],
    points: Number(r[1]),
    fitPoints: Number(r[2]),
    holdPoints: Number(r[3]),
    heldoutRms: Number(r[4]),
    resampleFactor: Number(f[1]),
    trainRms: Number(t[1]),
  };
}

/** 正文的四类数据源表：每类给什么、上限在哪。 */
function sources(text) {
  const out = [];
  for (const line of String(text).split('\n')) {
    const cells = line.split('|').map((x) => x.trim());
    if (cells.length < 6) continue;
    if (!/^(断层影像|体表形貌|功能信号|先验模型)$/.test(cells[1])) continue;
    out.push({ name: cells[1], gives: cells[3], limit: cells[4] });
  }
  if (out.length !== 4) throw new Error('正文的数据源表不足四类，实得 ' + out.length);
  return out;
}

function compute(text) {
  const s = settings(text);
  const [a, b, c] = s.voxel;
  const volume = a * b * c;
  const densityRatio = Math.max(a, b, c) / Math.min(a, b, c);
  const rigidDof = 6;
  // 每个标记点给两个坐标方程（x、y；z 可补），三个点正好六个方程
  const eqForSixDof = 3 * 2;
  const eqAll = s.points * 2;
  const ratio = s.heldoutRms / s.trainRms;
  return {
    ...s,
    volume,
    densityRatio,
    rigidDof,
    eqForSixDof,
    eqAll,
    ratio,
    hanzi: (text.match(HANZI) || []).length,
  };
}

function checks(text) {
  const c = compute(text);
  const S = sources(text);
  const near = (x, y, tol) => Math.abs(x - y) <= tol;
  return [
    {
      name: '各向异性体素的体积与密度比',
      ok: near(c.volume, 0.25, 1e-9) && near(c.densityRatio, 2, 1e-9),
      note: `${c.voxel.join('×')} mm → 体积 ${c.volume} mm³，三向采样密度差 ${c.densityRatio} 倍（正文写「差 2 倍」）`,
    },
    {
      name: '重采样倍数按立方增长，不新增信息',
      ok: c.resampleFactor === 8 && near((1 / c.voxel[0]) ** 3, 8, 1e-9),
      note: `边长减半 → 体素数 ×${c.resampleFactor}（正文写 8 倍）；信息量不变，变的是格点数`,
    },
    {
      name: '三个点恰好吃掉刚体自由度',
      ok: c.eqForSixDof === c.rigidDof,
      note: `${c.eqForSixDof} 个方程 / ${c.rigidDof} 个自由度 → 方程数刚好匹配，残差可为零，不能当精度`,
    },
    {
      name: '全部点参与时的方程数是未知数的四倍',
      ok: c.eqAll === 4 * c.rigidDof,
      note: `${c.points} 点 × 2 = ${c.eqAll} 个方程对 ${c.rigidDof} 个未知数；留出 ${c.holdPoints} 点是唯一能测出真实误差的路子`,
    },
    {
      name: '留出点残差是训练残差的倍数',
      ok: near(c.ratio, 2, 0.05),
      note: `${c.heldoutRms} mm ÷ ${c.trainRms} mm = ${c.ratio.toFixed(2)}，差距来自过拟合，不来自配准变好`,
    },
    {
      name: '四类数据源各有物理上限',
      ok: S.length === 4 && S.every((x) => x.gives && x.limit),
      note: S.map((x) => `${x.name}（${x.limit}）`).join('／'),
    },
  ];
}

function report() {
  const text = readDoc();
  const c = compute(text);
  const S = sources(text);
  console.log(`数字人体虚拟仿真 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('');
  console.log(`正文 ${c.hanzi.toLocaleString('en-US')} 汉字；体素 ${c.voxel.join('×')} mm。`);
  console.log('');
  console.log('一、各向异性：三维数据被当二维堆叠用');
  console.log(`  体素体积 ${c.volume} mm³；沿层厚与层内的采样密度差 ${c.densityRatio} 倍`);
  console.log(`  重采样到 ${c.voxel[0]} mm 各向同性：体素数 ×${c.resampleFactor}，信息量不变`);
  console.log('');
  console.log('二、配准：残差为什么会骗人');
  console.log(`  ${c.points} 个标记点，${c.fitPoints} 个求变换、${c.holdPoints} 个做检验`);
  console.log(`  三点给出 ${c.eqForSixDof} 个方程，刚体自由度 ${c.rigidDof} 个 → 残差可恒为零`);
  console.log(`  训练残差 ${c.trainRms} mm／留出点残差 ${c.heldoutRms} mm → 比值 ${c.ratio.toFixed(2)}`);
  console.log('');
  console.log('三、四类数据源能回答什么（正文表格逐行读出）');
  for (const x of S) console.log(`  ${x.name}：给 ${x.gives}；上限在 ${x.limit}`);
  console.log('');
  console.log('四、逐条对照正文数字');
  let bad = 0;
  for (const k of checks(text)) {
    console.log(`  ${k.ok ? '✓' : '✗'} ${k.name}：${k.note}`);
    if (!k.ok) bad += 1;
  }
  console.log('');
  console.log(bad ? `✗ ${bad} 条与正文不一致，正文或脚本需要同步。` : '✓ 全部对上：体素、倍数与残差都由正文设定现算，不靠手打。');
  console.log('※ 教学样例：体素尺寸与标记点分配按正文设定现算，不对应任何具体设备或病例。');
  console.log('※ 采集与使用人体数据须经伦理审查与知情同意，本章不构成采集方案。');
  return bad;
}

if (require.main === module) process.exitCode = report() ? 1 : 0;

module.exports = { readDoc, settings, sources, compute, checks, report, DOC, CHAPTER, TITLE };
