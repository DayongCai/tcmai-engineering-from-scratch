#!/usr/bin/env node
/**
 * 数字人体虚拟仿真 · 第 1 章 人体先被写成可寻址的结构，才谈得上被计算
 * 课程: departments/07-zhineng/12-shuzi-renti-xuni-fangzhen/chapters/01-dh1/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的量级全部从正文现算：先把正文写下的设定（矩阵、体素字节数、层厚、层级表）读出来，
 * 再按体积与重采样关系复算一遍，逐条与正文数字对照。正文改一个字，报告跟着变。
 * 本章要立的判断：精度不是一个数字，是一个层级声明。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 1;
const TITLE = '人体先被写成可寻址的结构，才谈得上被计算';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function readDoc() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function pick(text, re, label) {
  const m = String(text).match(re);
  if (!m) throw new Error('正文里没找到' + label + '，正则需随正文一起改: ' + re);
  return Number(m[1]);
}

/** 正文写下的设定值：一张 512×512×500 的 CT、每体素 2 字节、层厚 1 mm／层内 0.5 mm。 */
function settings(text) {
  const m = String(text).match(/(\d+)\s*×\s*(\d+)\s*×\s*(\d+)/);
  if (!m) throw new Error('正文里没找到体数据矩阵（形如 512×512×500）');
  return {
    cols: Number(m[1]),
    rows: Number(m[2]),
    slices: Number(m[3]),
    bytesPerVoxel: pick(text, /每体素\s*(\d+)\s*字节/, '体素字节数'),
    statedYi: pick(text, /=\s*([\d.]+)\s*亿个体素/, '正文体素数（亿）'),
    statedMb: pick(text, /存下来约\s*(\d+)\s*MB/, '正文存贮量（MB）'),
    statedGb: pick(text, /就变成约\s*(\d+)\s*GB/, '正文加密后存贮量（GB）'),
    statedFactor: pick(text, /1\/0\.5\)\^3\s*=\s*(\d+)/, '正文重采样倍数'),
    sliceMm: pick(text, /层厚\s*(\d+)\s*mm/, '层厚'),
    inplaneMm: pick(text, /层内像素\s*([\d.]+)\s*mm/, '层内像素'),
  };
}

/** 分层交付表：全身／器官／局部三层各自的上限尺度。 */
function layers(text) {
  const out = [];
  for (const line of String(text).split('\n')) {
    const m = line.match(/^\|\s*(全身|器官|局部／组织)\s*\|\s*([^|]+?)\s*\|/);
    if (!m) continue;
    const cell = m[2].replace(/mm/g, ' ').replace(/／/g, ' ');
    const nums = (cell.match(/[\d.]+/g) || []).map(Number);
    if (!nums.length) continue;
    out.push({ name: m[1], cell: m[2].trim(), maxMm: Math.max(...nums), minMm: Math.min(...nums) });
  }
  if (out.length < 3) throw new Error('正文里的分层交付表不足三行');
  return out;
}

function compute(text) {
  const s = settings(text);
  const voxels = s.cols * s.rows * s.slices;
  const bytes = voxels * s.bytesPerVoxel;
  const mib = bytes / 1024 ** 2;
  const factor = (s.sliceMm / s.inplaneMm) ** 3;
  const bytesFine = bytes * factor;
  return {
    ...s,
    voxels,
    bytes,
    mib,
    factor,
    bytesFine,
    hanzi: (text.match(HANZI) || []).length,
  };
}

/** 逐条对照：正文数 vs 复算数。返回 {name, ok, note}。 */
function checks(text) {
  const c = compute(text);
  const L = layers(text);
  const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-9);
  return [
    {
      name: '体素数复算',
      ok: rel(c.voxels / 1e8, c.statedYi) < 0.01,
      note: `${c.cols}×${c.rows}×${c.slices} = ${c.voxels.toLocaleString('en-US')}，即 ${(c.voxels / 1e8).toFixed(3)} 亿（正文 ${c.statedYi} 亿）`,
    },
    {
      name: '存贮量按 MiB 口径',
      ok: rel(c.mib, c.statedMb) < 0.02,
      note: `${c.bytes.toLocaleString('en-US')} 字节 = ${c.mib.toFixed(1)} MiB（正文写 ${c.statedMb} MB，用的是 1024 进制）`,
    },
    {
      name: '重采样倍数按立方增长',
      ok: c.factor === c.statedFactor,
      note: `(${c.sliceMm}/${c.inplaneMm})³ = ${c.factor}（正文写 ${c.statedFactor} 倍）`,
    },
    {
      name: '加密后存贮量',
      ok: rel(c.bytesFine / 1e9, c.statedGb) < 0.1,
      note: `${(c.bytesFine / 1e9).toFixed(2)} GB（正文写约 ${c.statedGb} GB）`,
    },
    {
      name: '层级尺度随范围收紧而变细',
      ok: L[0].maxMm > L[1].maxMm && L[1].maxMm > L[2].minMm,
      note: L.map((l) => `${l.name} ${l.cell}`).join(' < '),
    },
  ];
}

function report() {
  const text = readDoc();
  const c = compute(text);
  const L = layers(text);
  console.log(`数字人体虚拟仿真 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('');
  console.log(`正文 ${c.hanzi.toLocaleString('en-US')} 汉字；体数据 ${c.cols}×${c.rows}×${c.slices}，每体素 ${c.bytesPerVoxel} 字节。`);
  console.log('');
  console.log('一、体素到存贮的现算');
  console.log(`  体素数 ${c.voxels.toLocaleString('en-US')} → 约 ${(c.voxels / 1e8).toFixed(2)} 亿`);
  console.log(`  存贮 ${c.bytes.toLocaleString('en-US')} 字节 → ${c.mib.toFixed(1)} MiB（约 ${(c.mib / 1024).toFixed(2)} GiB）`);
  console.log(`  层厚 ${c.sliceMm} mm／层内 ${c.inplaneMm} mm：体素是 ${c.inplaneMm}×${c.inplaneMm}×${c.sliceMm} 的扁长方体，各向采样密度差 ${(c.sliceMm / c.inplaneMm).toFixed(0)} 倍`);
  console.log('');
  console.log('二、分层交付的尺度阶梯（正文表格逐行读出）');
  for (const l of L) console.log(`  ${l.name.padEnd(5, '　')} ${l.cell} → 上限 ${l.maxMm} mm`);
  console.log(`  → 从全身到局部，最小可分辨尺度相差约 ${(L[0].maxMm / L[2].minMm).toFixed(0)} 倍`);
  console.log('');
  console.log('三、逐条对照正文数字');
  let bad = 0;
  for (const k of checks(text)) {
    console.log(`  ${k.ok ? '✓' : '✗'} ${k.name}：${k.note}`);
    if (!k.ok) bad += 1;
  }
  console.log('');
  console.log(bad ? `✗ ${bad} 条与正文不一致，正文或脚本需要同步。` : '✓ 全部对上：本章的量级都由矩阵与层厚现算，不靠手打。');
  console.log('※ 教学样例：数字按正文给出的矩阵与层厚现算，不对应任何具体设备或数据集。');
  console.log('※ 本章不给出建模精度指标，也不构成医学意见或诊断依据。');
  return bad;
}

if (require.main === module) process.exitCode = report() ? 1 : 0;

module.exports = { readDoc, settings, layers, compute, checks, report, DOC, CHAPTER, TITLE };
