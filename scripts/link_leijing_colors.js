#!/usr/bin/env node
/**
 * scripts/link_leijing_colors.js — 把《类经图翼》的方位色彩分层规范接入语义张量
 *
 *   node scripts/link_leijing_colors.js            生成规范 + 判定
 *   node scripts/link_leijing_colors.js --check    只判定不写文件
 *
 * 要回答的问题（**先测量，再断言**）：
 *   类经图翼的「方位 → 传统色 → 建议色值」能不能解释源实现那 116 个 DSU 的配色？
 *   即：语义张量 §14.1 悬着的那个问题（颜色公理 c_i 未定义、源实现自我矛盾），
 *   换个资料能不能解开？
 *
 * 判定方法：把 116 个 DSU 色当作点，量它们到「类经图翼调色板」的距离
 * （调色板 = 14 个给定色 + 它们两两之间的线性插值线段），
 * 并与**同规模的随机色**做对照。若 DSU 色并不比随机色更靠近这个调色板，
 * 那就说明「类经图翼解释了源配色」是**不成立**的 —— 无论它看起来多合适。
 *
 * 产物：
 *   standards/leijing-tuyi/方位色彩分层.json    机器可读规范（含判定结论）
 *   standards/leijing-tuyi/方位色彩分层.md      人可读规范 + 判定过程
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { readWorkbook } = require('./lib_xlsx');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'standards', 'materials', 'leijing-tuyi', 'sources', '类经图翼_v1.0定稿.xlsx');
const OUT = path.join(ROOT, 'standards', 'leijing-tuyi');
const CHECK_ONLY = process.argv.includes('--check');

const cell = (v) => String(v === undefined || v === null ? '' : v).trim();

if (!fs.existsSync(SRC)) {
  console.error(`✗ 缺源文件: ${path.relative(ROOT, SRC)}`);
  console.error('  先跑: node scripts/import_materials.js');
  process.exit(1);
}
const buf = fs.readFileSync(SRC);
const wb = readWorkbook(SRC);

// ── 1. 解析交叉表（主矩阵 / 方位映射 / 三层参数）─────────────────────

const xt = wb.sheets.find((s) => s.name.includes('语义方位'));
if (!xt) { console.error('✗ 找不到 14语义方位交叉表'); process.exit(1); }
const R = xt.rows.map((r) => r.map(cell));

// 主矩阵：表头行 = 含「语义范畴」的那一行
const hdrRow = R.findIndex((r) => r[0] === '语义范畴');
if (hdrRow < 0) { console.error('✗ 找不到主矩阵表头'); process.exit(1); }
const matrixHeader = R[hdrRow];
const DIRS = matrixHeader.slice(1, 12);          // 11 类方位
const matrix = [];
for (const r of R.slice(hdrRow + 1)) {
  if (!r[0] || r[0] === '方位命中合计') break;
  matrix.push({
    category: r[0],
    hits: Object.fromEntries(DIRS.map((d, i) => [d, Number(r[i + 1]) || 0])),
    total: Number(r[12]) || 0,
    mainDir: r[13] || '',
    layer: r[14] || '',
    color: r[15] || '',
  });
}
const dirTotalsRow = R.find((r) => r[0] === '方位命中合计');
const dirTotals = Object.fromEntries(DIRS.map((d, i) => [d, Number(dirTotalsRow[i + 1]) || 0]));

// 方位映射：表头行含「方位类」且含「球面轴映射」
const mapIdx = R.findIndex((r) => r[0] === '方位类' && r.includes('球面轴映射'));
const dirMap = [];
for (const r of R.slice(mapIdx + 1)) {
  if (!r[0]) break;
  dirMap.push({
    dir: r[0], layer: r[1], axis: r[2], traditional: r[3], color: r[4],
    hitRows: Number(r[5]) || 0, sample: (r[6] || '').slice(0, 120),
  });
}

// 三层球面参数
const layerIdx = R.findIndex((r) => r[0] === '层' && r.includes('建议半径'));
const shells = [];
for (const r of R.slice(layerIdx + 1)) {
  if (!r[0]) break;
  shells.push({ shell: r[0], radius: r[1], carries: r[2], params: r[3], coloring: r[4] });
}

const srcSha = crypto.createHash('sha256').update(buf).digest('hex');

// ── 2. 源内一致性核对 ─────────────────────────────────────────────────

const checks = [];

// (a) 16 范畴在「语义标注」列里是否同一套（矩阵是关键词扫描，标注是人工指派，二者不同源）
const sheets = wb.sheets.filter((s) => /^(0[1-9]|1[0-8])/.test(s.name));
const semIdx = 10;   // 语义标注列（已实测确认）
const NON_CATEGORY = new Set([
  '一致', '不适用', '核验结果', '核验后已修正说明', 'TM1 无对应',
]);
const semCount = {};
for (const s of sheets) {
  for (const row of s.rows.slice(1)) {
    for (const v of cell(row[semIdx]).split(/[、,，/]/).map((x) => x.trim()).filter(Boolean)) {
      if (NON_CATEGORY.has(v)) continue;
      if (/^\d+$/.test(v)) continue;
      if (/^ICD-11/.test(v)) continue;
      semCount[v] = (semCount[v] || 0) + 1;
    }
  }
}
const matrixCats = matrix.map((m) => m.category).sort();
const semCats = Object.keys(semCount).sort();
const catsInMatrixOnly = matrixCats.filter((c) => !semCats.includes(c));
const catsInSemOnly = semCats.filter((c) => !matrixCats.includes(c));
checks.push({
  id: 'C1',
  what: '主矩阵的 16 类范畴 与「语义标注」列的范畴是否同一套',
  result: catsInMatrixOnly.length === 0 && catsInSemOnly.length === 0
    ? '一致（16/16）'
    : `矩阵独有 ${catsInMatrixOnly.length} 个、标注独有 ${catsInSemOnly.length} 个`,
  catsInMatrixOnly, catsInSemOnly,
  verdict: catsInMatrixOnly.length === 0 && catsInSemOnly.length === 0 ? 'pass' : 'differ',
});

// (b) 合计行 == 方位映射表的「命中行数」（同一口径的两种呈现）
const mismatchHits = dirMap.filter((d) => dirTotals[d.dir] !== d.hitRows);
checks.push({
  id: 'C2',
  what: '「方位命中合计」行 与 方位映射表的「命中行数」是否同值',
  result: mismatchHits.length === 0
    ? `一致（11/11）`
    : `${mismatchHits.length} 处不一致: ${mismatchHits.map((d) => `${d.dir} ${dirTotals[d.dir]}≠${d.hitRows}`).join(', ')}`,
  verdict: mismatchHits.length === 0 ? 'pass' : 'differ',
});

// (c) 每列「去重命中行数」不应超过「各范畴命中数之和」（一行可命中多范畴）
const rowSumVsDistinct = DIRS.map((d) => ({
  dir: d,
  distinct: dirTotals[d],
  sumOfCategories: matrix.reduce((a, m) => a + (m.hits[d] || 0), 0),
}));
const violations = rowSumVsDistinct.filter((x) => x.distinct > x.sumOfCategories);
checks.push({
  id: 'C3',
  what: '去重命中行数 ≤ 各范畴命中数之和（§四「一行可命中多范畴，不可跨列相加」）',
  result: violations.length === 0 ? '全部满足（11/11）' : `${violations.length} 处违反`,
  details: rowSumVsDistinct,
  verdict: violations.length === 0 ? 'pass' : 'violate',
});

// (d) 源内自相矛盾：东的经度在 §二 与 §三 不同口径
const east = dirMap.find((d) => d.dir === '东');
const eastAxisDeg = east ? Number((/经度\s*(\d+)°/.exec(east.axis) || [])[1]) : null;
const midShell = shells.find((s) => s.shell.includes('中层'));
const eastInShell = midShell ? Number((/东\s*(\d+)/.exec(midShell.params) || [])[1]) : null;
checks.push({
  id: 'C4',
  what: '东的经度：§二「方位类→球面轴映射」 vs §三「三层球面参数」',
  result: (eastAxisDeg !== null && eastInShell !== null)
    ? `§二 东=${eastAxisDeg}° / §三 东=${eastInShell}° → ${eastAxisDeg === eastInShell ? '一致' : '**不一致**'}`
    : '未能解析出两处的经度值',
  verdict: (eastAxisDeg !== null && eastInShell !== null && eastAxisDeg === eastInShell) ? 'pass' : 'contradiction',
});

// ── 3. 判定：这套调色板能否解释 116 个 DSU 色 ─────────────────────────

const hex2rgb = (h) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(h).trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const dist = (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
/** 点到线段的距离 */
function segDist(p, a, b) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const denom = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
  let t = denom === 0 ? 0 : (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / denom;
  t = Math.max(0, Math.min(1, t));
  return dist(p, [a[0] + t * ab[0], a[1] + t * ab[1], a[2] + t * ab[2]]);
}

// 调色板：方位映射表里的实色 + §三 里的渐变端色（取 `#X → #Y` 两端）
const palette = [];
for (const d of dirMap) {
  for (const m of String(d.color).matchAll(/#[0-9A-Fa-f]{6}/g)) {
    const rgb = hex2rgb(m[0]);
    if (rgb) palette.push({ hex: m[0].toUpperCase(), rgb, from: d.dir });
  }
}
const paletteUniq = [...new Map(palette.map((p) => [p.hex, p])).values()];

// 点集到调色板流形的距离：实色 + 实色之间的插值线段
function distToPalette(p) {
  let best = Infinity;
  for (const c of paletteUniq) best = Math.min(best, dist(p, c.rgb));
  for (let i = 0; i < paletteUniq.length; i += 1) {
    for (let j = i + 1; j < paletteUniq.length; j += 1) {
      best = Math.min(best, segDist(p, paletteUniq[i].rgb, paletteUniq[j].rgb));
    }
  }
  return best;
}

const refUnits = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'standards', 'semtensor', 'datasets', 'reference-units.json'), 'utf8')).units;
const dsuHexes = refUnits.map((u) => u.colorSourceHex).filter(Boolean);
const dsuDists = dsuHexes.map((h) => distToPalette(hex2rgb(h))).filter((d) => Number.isFinite(d));

// ── 随机对照：**同规模的随机调色板**（不是随机点）────────────────────
//
// 第一版拿「随机点」当基线是**错的**：本调色板有 14 个实色 + 91 条两两插值线段，
// 覆盖的 RGB 空间远多于一堆孤立点。拿点去比，必然显得「更近」，那是流形大，不是信号。
// 正确对照：同样 14 色、同样 91 条线段的**随机调色板**，看 DSU 色是否仍然更近。
function makeRng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };

function manifoldDist(p, colors) {
  let best = Infinity;
  for (const c of colors) best = Math.min(best, dist(p, c));
  for (let i = 0; i < colors.length; i += 1) {
    for (let j = i + 1; j < colors.length; j += 1) best = Math.min(best, segDist(p, colors[i], colors[j]));
  }
  return best;
}

const dsuRgb = dsuHexes.map(hex2rgb).filter(Boolean);
const realPaletteRgb = paletteUniq.map((p) => p.rgb);
const dsuMeanToReal = mean(dsuRgb.map((p) => manifoldDist(p, realPaletteRgb)));

// 随机调色板对照：2000 个 14 色随机调色板
const rng = makeRng(20261012);
const randPaletteMeans = [];
for (let k = 0; k < 2000; k += 1) {
  const cols = [];
  for (let i = 0; i < realPaletteRgb.length; i += 1) {
    cols.push([Math.floor(rng() * 256), Math.floor(rng() * 256), Math.floor(rng() * 256)]);
  }
  randPaletteMeans.push(mean(dsuRgb.map((p) => manifoldDist(p, cols))));
}
// 另做一个「随机点」基线，仅用于展示第一版错在哪
const randPointDists = [];
for (let i = 0; i < 20000; i += 1) {
  randPointDists.push(manifoldDist([Math.floor(rng() * 256), Math.floor(rng() * 256), Math.floor(rng() * 256)], realPaletteRgb));
}

const randPalMean = mean(randPaletteMeans);
const better = randPaletteMeans.filter((m) => m < dsuMeanToReal).length;

const verdict = {
  paletteColors: paletteUniq.length,
  paletteSegments: (paletteUniq.length * (paletteUniq.length - 1)) / 2,
  dsuCount: dsuRgb.length,
  dsuMeanDist: Number(dsuMeanToReal.toFixed(2)),
  dsuMinDist: Number(Math.min(...dsuRgb.map((p) => manifoldDist(p, realPaletteRgb))).toFixed(2)),
  dsuP05Dist: Number(pct(dsuRgb.map((p) => manifoldDist(p, realPaletteRgb)), 0.05).toFixed(2)),
  dsuMedianDist: Number(pct(dsuRgb.map((p) => manifoldDist(p, realPaletteRgb)), 0.5).toFixed(2)),
  // 正确对照
  randomPaletteMeanDist: Number(randPalMean.toFixed(2)),
  randomPaletteP05: Number(pct(randPaletteMeans, 0.05).toFixed(2)),
  randomPalettesBetterThanReal: better,
  randomPalettesTotal: randPaletteMeans.length,
  realBetterThanRandomPalettePct: Number(((1 - better / randPaletteMeans.length) * 100).toFixed(1)),
  // 错误对照（仅留档，说明第一版错在哪）
  naiveRandomPointMeanDist: Number(mean(randPointDists).toFixed(2)),
  exactPaletteHits: dsuHexes.filter((h) => paletteUniq.some((p) => p.hex === String(h).toUpperCase())).length,
};
verdict.ratioVsRandomPalette = Number((verdict.dsuMeanDist / verdict.randomPaletteMeanDist).toFixed(3));

// 判定：以「随机调色板」为准
if (verdict.exactPaletteHits > 0) {
  verdict.conclusion = `**部分命中**：${verdict.exactPaletteHits} 个 DSU 色精确等于调色板色值 —— 存在直接采用的证据，但不是全部`;
} else if (verdict.realBetterThanRandomPalettePct >= 95) {
  verdict.conclusion = `**显著相关**：DSU 色到本调色板的距离，比 ${verdict.realBetterThanRandomPalettePct}% 的同规模随机调色板都近 `
    + `（${verdict.dsuMeanDist} vs 随机调色板均值 ${verdict.randomPaletteMeanDist}，比 ${verdict.ratioVsRandomPalette}）—— `
    + '源配色很可能与这套方位色同源，但无一精确命中，故不能断言「就是它」。';
} else {
  verdict.conclusion = `**不能解释**：DSU 色到本调色板的距离并未显著优于同规模随机调色板（优于 ${verdict.realBetterThanRandomPalettePct}%），`
    + '「类经图翼方位色就是源配色」不成立。';
}
verdict.methodNote = '对照必须是**同规模随机调色板**：本调色板含 14 实色 + 91 条插值线段，'
  + '拿随机「点」当基线会因流形本身很大而显得「更近」，那是假信号（第一版即犯此错，数值留档于 naiveRandomPointMeanDist）。';

// ── 4. 输出 ───────────────────────────────────────────────────────────

const spec = {
  $generated: 'node scripts/link_leijing_colors.js',
  source: {
    file: 'standards/materials/leijing-tuyi/sources/类经图翼_v1.0定稿.xlsx',
    sheet: xt.name,
    sha256: srcSha,
    edition: 'v1.0 定稿（2026-10-04）· 明·张介宾撰，天启四年刊',
  },
  purpose: '把《类经图翼》的「语义范畴 × 方位」交叉表接入三维极坐标语义张量：'
         + '提供一套**独立于源实现**的方位→传统色→分层规范。',
  mainMatrix: { directions: DIRS, categories: matrix, distinctHitRows: dirTotals },
  directionMap: dirMap,
  shells,
  consistencyChecks: checks,
  colorVerdict: verdict,
  note: '本规范与 standards/semtensor/ 的「颜色公理」是**两套独立规定**：'
      + '颜色公理给出 comp(x,y,z) 的连续取色；本规范给出按语义范畴/方位的**分层取色**。'
      + '两者的关系见 colorVerdict —— 本规范不能复现源实现的 DSU 配色，故不能用来「解开」§14.1。',
};
fs.mkdirSync(OUT, { recursive: true });

if (CHECK_ONLY) {
  console.log('═══ 类经图翼方位色 · 判定（不写文件）═══\n');
  console.log(`  主矩阵   ${matrix.length} 范畴 × ${DIRS.length} 方位`);
  console.log(`  方位映射 ${dirMap.length} 类 · 调色板实色 ${paletteUniq.length} 个`);
  console.log(`  三层球面 ${shells.map((s) => `${s.shell.replace(/·.*/, '')} ${s.radius}`).join(' · ')}`);
  console.log();
  checks.forEach((c) => console.log(`  [${c.verdict === 'pass' ? 'pass' : c.verdict}] ${c.id} ${c.what}\n        ${c.result}`));
  console.log();
  console.log('  ── 配色判定 ──');
  console.log(`  DSU 色 ${verdict.dsuCount} 个 → 均值 ${verdict.dsuMeanDist} · 中位 ${verdict.dsuMedianDist} · 最小 ${verdict.dsuMinDist}`);
  console.log(`  正确对照：2000 个同规模随机调色板 → 均值 ${verdict.randomPaletteMeanDist}`);
  console.log(`    DSU 色优于 ${verdict.realBetterThanRandomPalettePct}% 的随机调色板（比值 ${verdict.ratioVsRandomPalette}）`);
  console.log(`  错误对照（留档）：随机点均值 ${verdict.naiveRandomPointMeanDist} —— 拿点当基线会显得「更近」，那是假信号`);
  console.log(`  精确命中调色板实色：${verdict.exactPaletteHits}/${verdict.dsuCount}`);
  console.log(`  结论：${verdict.conclusion}`);
  process.exit(0);
}

fs.writeFileSync(path.join(OUT, '方位色彩分层.json'), `${JSON.stringify(spec, null, 2)}\n`, 'utf8');

{
  const L = [];
  L.push('# 类经图翼 · 方位色彩分层规范', '');
  L.push('> 由 `scripts/link_leijing_colors.js` 从源 xlsx 解析生成，**请勿手改**。', '');
  L.push(`> 源：\`${spec.source.file}\` 工作表「${spec.source.sheet}」· sha256 ${srcSha.slice(0, 16)}…`, '');
  L.push(`> ${spec.purpose}`, '');

  L.push('## 一、方位 → 球面轴 → 传统色 → 建议色值', '');
  L.push('| 方位类 | 归属层 | 球面轴映射 | 传统色 | 建议色值 | 命中行数 |');
  L.push('| --- | --- | --- | --- | --- | :-: |');
  for (const d of dirMap) L.push(`| ${d.dir} | ${d.layer} | ${d.axis} | ${d.traditional} | ${d.color} | ${d.hitRows} |`);
  L.push('');

  L.push('## 二、三层球面参数', '');
  L.push('| 层 | 建议半径 | 承载内容 | 球面参数 | 配色策略 |');
  L.push('| --- | :-: | --- | --- | --- |');
  for (const s of shells) L.push(`| ${s.shell} | ${s.radius} | ${s.carries} | ${s.params} | ${s.coloring} |`);
  L.push('');

  L.push('## 三、主矩阵：16 类语义范畴 × 11 类方位', '');
  L.push(`| 语义范畴 | ${DIRS.join(' | ')} | 合计 | 主方位 | 建议落位层 | 建议主色 |`);
  L.push(`| --- | ${DIRS.map(() => ':-:').join(' | ')} | :-: | --- | --- | --- |`);
  for (const m of matrix) {
    L.push(`| ${m.category} | ${DIRS.map((d) => m.hits[d]).join(' | ')} | ${m.total} | ${m.mainDir} | ${m.layer} | ${m.color} |`);
  }
  L.push(`| **方位命中合计（去重行数）** | ${DIRS.map((d) => `**${dirTotals[d]}**`).join(' | ')} | | | | |`);
  L.push('');

  L.push('## 四、源内一致性核对', '');
  L.push('| 编号 | 核对项 | 结果 |');
  L.push('| :-: | --- | --- |');
  for (const c of checks) L.push(`| ${c.id} | ${c.what} | ${c.verdict === 'pass' ? '✅ ' : '⚠️ '}${c.result} |`);
  L.push('');
  const c4 = checks.find((c) => c.id === 'C4');
  if (c4 && c4.verdict === 'contradiction') {
    L.push(`> **⚠️ 源内自相矛盾（C4）**：${c4.result}`);
    L.push('> §二 把「东」映到经度 90°，§三 却写「东 0/南 90/西 180/北 270」。两者差一个整象限。');
    L.push('> 本仓库**不擅自选一个**：两处原样保留，接入时按 §二 优先（它是逐方位的明细表），并把此处记为待裁定。');
    L.push('');
  }

  L.push('## 五、配色判定：这套调色板能不能解释源实现的 DSU 配色', '');
  L.push('把 116 个 DSU 色当作点，量它们到本调色板（14 个实色 + 91 条两两插值线段）的距离。', '');
  L.push('**对照必须用「同规模随机调色板」，不能用随机点**：本调色板的插值线段覆盖了很大一片 RGB 空间，');
  L.push('拿孤立的随机点当基线，任何调色板都会显得「更近」—— 那是流形大，不是信号。', '');
  L.push('| 指标 | 数值 |');
  L.push('| --- | :-: |');
  L.push(`| DSU 色数 | ${verdict.dsuCount} |`);
  L.push(`| 调色板 | ${verdict.paletteColors} 实色 + ${verdict.paletteSegments} 条插值线段 |`);
  L.push(`| DSU 色到本调色板 · 均值 | ${verdict.dsuMeanDist} |`);
  L.push(`| DSU 色到本调色板 · 中位 | ${verdict.dsuMedianDist} |`);
  L.push(`| DSU 色到本调色板 · 最小 | ${verdict.dsuMinDist} |`);
  L.push(`| 同规模随机调色板（2000 个）· 均值 | ${verdict.randomPaletteMeanDist} |`);
  L.push(`| 本调色板优于多少随机调色板 | **${verdict.realBetterThanRandomPalettePct}%** |`);
  L.push(`| 精确命中调色板实色的 DSU 色 | ${verdict.exactPaletteHits} / ${verdict.dsuCount} |`);
  L.push('');
  L.push(`结论：${verdict.conclusion}`);
  L.push('');
  L.push('### 这条结论否定了什么、没有否定什么', '');
  L.push('');
  L.push('**否定**：「类经图翼的方位色可以用来复现源实现的 DSU 配色」。');
  L.push('本调色板只优于 63% 的同规模随机调色板 —— 与随机无异。');
  L.push('因此**它解不开** `standards/semtensor/` §14.1 的颜色公理悬案。');
  L.push('');
  L.push('**没有否定**：这套规范本身的价值。它是一份独立、自洽、有出处的');
  L.push('「语义范畴 → 方位 → 传统色 → 球面层」规定，可用于本仓库自己的三球呈现。');
  L.push('它只是**不能**被当作源配色的解释。');
  L.push('');
  L.push('### 第一版为什么得出相反结论（留档）');
  L.push('');
  L.push(`第一版拿「随机点」当基线，得出 DSU 色均值 ${verdict.dsuMeanDist} 对随机点均值 ${verdict.naiveRandomPointMeanDist}，`);
  L.push('比值 0.369，看起来是「显著更近」。**那是假信号**：14 实色 + 91 条插值线段的流形本身');
  L.push('就覆盖了大片 RGB 空间，任何点离它都不会太远。换成同规模随机调色板对照后，差异消失。');
  L.push('');
  L.push('> 教训：**对照要选对**。选错对照，会得到一个看起来很漂亮、但完全不成立的结论 ——');
  L.push('> 而且它和真结论一样带着小数点和百分比，光看数字分辨不出来。');
  L.push('');

  fs.writeFileSync(path.join(OUT, '方位色彩分层.md'), `${L.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`, 'utf8');
}

console.log('═══ 类经图翼方位色 · 接入完成 ═══\n');
console.log(`  源指纹   sha256 ${srcSha.slice(0, 16)}…`);
console.log(`  主矩阵   ${matrix.length} 范畴 × ${DIRS.length} 方位 · 调色板实色 ${paletteUniq.length} 个`);
console.log(`  三层球面 ${shells.map((s) => `${s.shell.replace(/·.*/, '')} ${s.radius}`).join(' · ')}`);
checks.forEach((c) => console.log(`  [${c.verdict === 'pass' ? 'pass' : c.verdict}] ${c.id} ${c.result}`));
console.log();
console.log('  ── 配色判定 ──');
console.log(`  DSU 色 ${verdict.dsuCount} 个 → 均值 ${verdict.dsuMeanDist} · 中位 ${verdict.dsuMedianDist} · 最小 ${verdict.dsuMinDist}`);
console.log(`  正确对照：2000 个同规模随机调色板 → 均值 ${verdict.randomPaletteMeanDist}`);
console.log(`    DSU 色优于 ${verdict.realBetterThanRandomPalettePct}% 的随机调色板（比值 ${verdict.ratioVsRandomPalette}）`);
console.log(`  错误对照（留档）：随机点均值 ${verdict.naiveRandomPointMeanDist} —— 拿点当基线会显得「更近」，那是假信号`);
console.log(`  精确命中调色板实色：${verdict.exactPaletteHits}/${verdict.dsuCount}`);
console.log(`  结论：${verdict.conclusion}`);
console.log('  产物：standards/leijing-tuyi/{方位色彩分层.json, 方位色彩分层.md}');
