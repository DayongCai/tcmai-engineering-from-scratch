#!/usr/bin/env node
/**
 * 对着源实现验证颜色公理的两种读法。
 *
 * 背景：规范正文里写的是 `C = (1−k)·绿 + k·(Σ w_i·c_i / Σ w_i)`，
 * 但**没有定义 `c_i`**。两种自然读法：
 *   A（我最初的读法）  c_i = 该轴在 sign(v_i) 一侧的**端色**（纯色）
 *   B（源实现的做法）  c_i = ramp(v_i, axis)，即该分量取值处的**插值色**
 * 二者在 |v_i| = 1 时相同，在 0 < |v_i| < 1 时不同。
 *
 * 本脚本用源实现自带的 116 个单元（含各自的 x/y/z 与 hex）来判定哪种读法是对的。
 * 这一步不需要目视，也不需要猜 —— 源数据就是答案。
 *
 *   node scripts/verify_semtensor_axiom.js [源 HTML 路径]
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_SRC = path.join(
  process.env.LOCALAPPDATA || '',
  'Hermes Agent CN Desktop', 'data', 'hermes-home', 'attachments',
  '母子父-三维极坐标语义球面-同步旋转.html'
);

const src = process.argv[2] || DEFAULT_SRC;
const alt = path.join(ROOT, 'standards', 'semtensor', 'sources', '母子父-三维极坐标语义球面-同步旋转.html');
const file = fs.existsSync(src) ? src : alt;

if (!fs.existsSync(file)) {
  console.error(`✗ 找不到源实现 HTML：\n  ${src}\n  ${alt}\n  （用法: node scripts/verify_semtensor_axiom.js <路径>）`);
  process.exit(1);
}

const html = fs.readFileSync(file, 'utf8');
const m = html.match(/const DATA = (\{[\s\S]*?\});\s*\n/);
if (!m) {
  console.error('✗ 未能从 HTML 中取出 DATA 常量');
  process.exit(1);
}
const DATA = JSON.parse(m[1]);

// ── 端色常量（与源实现一致；逐字取自源文件第 113–124 行）──
const C_O = [0.0, 0.69, 0.314];
const AXIS_EP = {
  X: { I: [1.0, 0.549, 0.0], O: C_O, T: [0.541, 0.169, 0.886] },
  Y: { I: [0.122, 0.38, 0.851], O: C_O, T: [0.859, 0.11, 0.11] },
  Z: { I: [0.949, 0.761, 0.0], O: C_O, T: [0.0, 0.78, 0.78] },
};
const AXES = ['X', 'Y', 'Z'];
const clip = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);

function ramp(t, axis) {
  const x = clip(t, -1, 1);
  const E = AXIS_EP[axis];
  const lo = x < 0 ? E.I : E.O;
  const hi = x < 0 ? E.O : E.T;
  const f = x < 0 ? x + 1 : x;
  return [0, 1, 2].map((i) => lo[i] + (hi[i] - lo[i]) * f);
}

function hexs(c) {
  return `#${c.map((x) => Math.round(clip(x, 0, 1) * 255).toString(16).padStart(2, '0').toUpperCase()).join('')}`;
}

/** 读法 B：源实现 —— c_i = ramp(v_i, axis) */
function compRamp(v) {
  const w = v.map((x) => clip(Math.abs(x), 0, 1));
  const k = Math.max(...w);
  const s = w[0] + w[1] + w[2];
  if (s < 1e-12 || k <= 0) return C_O.slice();
  const m = [0, 0, 0];
  for (let i = 0; i < 3; i += 1) {
    const c = ramp(v[i], AXES[i]);
    m[0] += w[i] * c[0];
    m[1] += w[i] * c[1];
    m[2] += w[i] * c[2];
  }
  return [0, 1, 2].map((i) => clip((1 - k) * C_O[i] + (k * m[i]) / s, 0, 1));
}

/** 读法 A：按字面把 c_i 理解成端色 */
function compEndpoint(v) {
  const w = v.map((x) => clip(Math.abs(x), 0, 1));
  const k = Math.max(...w);
  const s = w[0] + w[1] + w[2];
  if (s < 1e-12 || k <= 0) return C_O.slice();
  const m = [0, 0, 0];
  for (let i = 0; i < 3; i += 1) {
    if (w[i] === 0) continue;
    const c = AXIS_EP[AXES[i]][v[i] > 0 ? 'T' : 'I'];
    m[0] += w[i] * c[0];
    m[1] += w[i] * c[1];
    m[2] += w[i] * c[2];
  }
  return [0, 1, 2].map((i) => clip((1 - k) * C_O[i] + (k * m[i]) / s, 0, 1));
}

// ── 逐单元比对 ────────────────────────────────────────────────────────

const units = DATA.units || [];
const withHex = units.filter((u) => u.hex && Number.isFinite(u.x));

let okRamp = 0;
let okEndpoint = 0;
const diffsEndpoint = [];
const diffsRamp = [];

for (const u of withHex) {
  const v = [u.x, u.y, u.z];
  const a = hexs(compEndpoint(v));
  const b = hexs(compRamp(v));
  if (a === u.hex) okEndpoint += 1; else diffsEndpoint.push([u.uid, u.label, u.hex, a]);
  if (b === u.hex) okRamp += 1; else diffsRamp.push([u.uid, u.label, u.hex, b]);
}

console.log('═══ 颜色公理两种读法 · 对着源数据判定 ═══\n');
console.log(`  源文件     ${path.basename(file)}`);
console.log(`  样本        ${withHex.length} 个带 x/y/z 与 hex 的单元\n`);
console.log(`  A 端色读法  ${okEndpoint}/${withHex.length} 吻合`);
console.log(`  B ramp 读法 ${okRamp}/${withHex.length} 吻合`);
console.log('');

if (okRamp === withHex.length && okEndpoint < withHex.length) {
  console.log('  ✅ 判定：c_i = ramp(v_i, axis)（读法 B）是权威口径。');
  console.log('     规范正文只写了「Σ w_i·c_i」而未定义 c_i，读成端色会在 0<|v|<1 处全体偏色。');
} else if (okEndpoint === withHex.length) {
  console.log('  ✅ 判定：端色读法（读法 A）成立。');
} else if (okRamp === withHex.length && okEndpoint === withHex.length) {
  console.log('  两种读法都与源数据一致（样本可能都落在 |v|=1 上）。');
} else {
  console.log('  ⚠ 两种读法都无法复现源数据 —— 还有第三个未知差异。');
}

if (diffsEndpoint.length) {
  console.log('\n  A 读法不一致的前 5 例（源色 → A 算）：');
  for (const d of diffsEndpoint.slice(0, 5)) console.log(`    ${d[0]} ${d[1]}  ${d[2]} → ${d[3]}`);
}
if (diffsRamp.length) {
  console.log('\n  B 读法不一致的前 5 例（源色 → B 算）：');
  for (const d of diffsRamp.slice(0, 5)) console.log(`    ${d[0]} ${d[1]}  ${d[2]} → ${d[3]}`);
}

// ── 顺带核查：源数据自身与公理是否自洽 ──────────────────────────────
// 气 的 x=y=z=0 ⇒ 按公理应回基准绿，但源数据给的是 #00C7C7（Z 轴 T 端青）。
const qi = units.find((u) => u.label === '气');
if (qi) {
  const expect = hexs(compRamp([qi.x, qi.y, qi.z]));
  console.log(`\n  自洽性核查：单元「气」x=y=z=${qi.x},${qi.y},${qi.z} → 源 hex ${qi.hex}，按公理应得 ${expect}`);
  if (expect !== qi.hex) {
    console.log('  ⚠ 源数据在该点上与自身公理不一致（三轴全零应回基准绿）。见规范 §14.6。');
  }
}
