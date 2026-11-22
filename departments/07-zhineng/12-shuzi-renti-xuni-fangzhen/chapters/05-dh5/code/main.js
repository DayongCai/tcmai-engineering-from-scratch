#!/usr/bin/env node
/**
 * 数字人体虚拟仿真 · 第 5 章 聚类总能给你几个簇，问题是你敢不敢把它们当分型
 * 课程: departments/07-zhineng/12-shuzi-renti-xuni-fangzhen/chapters/05-dh5/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的覆盖率曲线、稳定性指标与维数比都从正文现算：读数、重算边际收益与每档比例，
 * 再按重采样稳定性判断三分是否成立。本章的判断：k 不是发现的，是被指定的。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 5;
const TITLE = '聚类总能给你几个簇，问题是你敢不敢把它们当分型';
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

/** 正文的覆盖率表：档数、覆盖率、每档需覆盖比例、边际收益。 */
function tiers(text) {
  const out = [];
  for (const line of String(text).split('\n')) {
    const m = line.match(/^\|\s*(\d)\s*\|\s*(\d+)%\s*\|\s*(\d+)%\s*\|\s*([^|]+?)\s*\|\s*$/);
    if (!m) continue;
    out.push({
      k: Number(m[1]),
      coverage: Number(m[2]),
      perTier: Number(m[3]),
      statedGain: m[4] === '—' ? null : Number((m[4].match(/[\d.]+/) || [])[0]),
    });
  }
  if (out.length < 4) throw new Error('覆盖率表不足四行，实得 ' + out.length);
  return out;
}

/** 正文设定：两档 k 的重采样 ARI 中位数与 5% 分位、维数比、重测判据。 */
function settings(text) {
  const t = String(text).replace(/\$/g, '');
  const a3 = pick(t, /k=3\s*时\s*ARI\s*中位数\s*([\d.]+)、\s*5%\s*分位\s*([\d.]+)/, 'k=3 的 ARI');
  const a2 = pick(t, /k=2\s*时中位数\s*([\d.]+)、\s*5%\s*分位\s*([\d.]+)/, 'k=2 的 ARI');
  const d1 = pick(t, /(\d+)\s*维、\s*(\d+)\s*例，样本与维数之比约\s*(\d+):1/, '低维样本比');
  const d2 = pick(t, /(\d+)\s*维而样本仍是\s*(\d+)\s*例，比值降到\s*(\d+):1/, '高维样本比');
  const band = pick(t, /比值小于\s*([\d.]+)\s*时/, '重测比值下限');
  const band2 = pick(t, /([\d.]+)–([\d.]+)\s*之间需要人工复核/, '重测比值区间');
  return {
    k3: { median: Number(a3[1]), q5: Number(a3[2]) },
    k2: { median: Number(a2[1]), q5: Number(a2[2]) },
    lowDims: { dims: Number(d1[1]), n: Number(d1[2]), ratio: Number(d1[3]) },
    highDims: { dims: Number(d2[1]), n: Number(d2[2]), ratio: Number(d2[3]) },
    band: [Number(band[1]), Number(band2[1]), Number(band2[2])],
  };
}

function compute(text) {
  const s = settings(text);
  const T = tiers(text).map((row, i, arr) => ({
    ...row,
    gain: i === 0 ? null : row.coverage - arr[i - 1].coverage,
    share: Math.round(row.coverage / row.k),
  }));
  return {
    ...s,
    tiers: T,
    medianGap: s.k2.median - s.k3.median,
    hanzi: (text.match(HANZI) || []).length,
  };
}

function checks(text) {
  const c = compute(text);
  const T = c.tiers;
  const gains = T.slice(1).map((r) => r.gain);
  const monoDown = gains.every((g, i) => i === 0 || g < gains[i - 1]);
  const statedOk = T.slice(1).every((r) => r.statedGain === r.gain);
  return [
    {
      name: '覆盖率随档数上升，边际收益递减',
      ok: T.every((r, i) => i === 0 || r.coverage > T[i - 1].coverage) && monoDown,
      note: `覆盖率 ${T.map((r) => r.coverage + '%').join(' → ')}；边际 ${gains.join('、')} 个百分点`,
    },
    {
      name: '边际收益列与相邻两档之差一致',
      ok: statedOk,
      note: T.slice(1).map((r) => `${r.k} 档 ${r.statedGain}（算 ${r.gain}）`).join('；'),
    },
    {
      name: '每档覆盖比例可用覆盖率除以档数复算',
      ok: T.every((r) => r.share === r.perTier),
      note: T.map((r) => `${r.k} 档：${r.coverage}% ÷ ${r.k} ≈ ${r.share}%`).join('；'),
    },
    {
      name: '两档稳定性中位数之差',
      ok: Math.abs(c.medianGap - 0.23) < 0.005,
      note: `k=2 中位数 ${c.k2.median} 对 k=3 的 ${c.k3.median}，差 ${c.medianGap.toFixed(2)}；5% 分位 ${c.k2.q5} 对 ${c.k3.q5}`,
    },
    {
      name: '维数比按样本数现算',
      ok: Math.abs(c.lowDims.n / c.lowDims.dims - 17) < 1 && Math.abs(c.highDims.n / c.highDims.dims - 4) < 0.2,
      note: `${c.lowDims.n}/${c.lowDims.dims} ≈ ${(c.lowDims.n / c.lowDims.dims).toFixed(1)}:1；扩到 ${c.highDims.dims} 维仍是 ${c.highDims.n} 例 → ${(c.highDims.n / c.highDims.dims).toFixed(1)}:1`,
    },
    {
      name: '重测比值三档判据',
      ok: c.band[0] === 0.3 && c.band[1] === 0.3 && c.band[2] === 0.5,
      note: `< ${c.band[0]} 可靠；${c.band[1]}–${c.band[2]} 人工复核；> ${c.band[2]} 只能用于群体统计`,
    },
  ];
}

function report() {
  const text = readDoc();
  const c = compute(text);
  console.log(`数字人体虚拟仿真 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('');
  console.log(`正文 ${c.hanzi.toLocaleString('en-US')} 汉字。`);
  console.log('');
  console.log('一、稳定性：k 不是发现的');
  console.log(`  k=2 重采样 ARI 中位数 ${c.k2.median}、5% 分位 ${c.k2.q5}`);
  console.log(`  k=3 重采样 ARI 中位数 ${c.k3.median}、5% 分位 ${c.k3.q5}`);
  console.log(`  → 中位数差 ${c.medianGap.toFixed(2)}：二分为稳、三分为不稳，不是「有点噪声」`);
  console.log('');
  console.log('二、档位数与覆盖率（正文表格逐行读出并复算）');
  console.log('  档数  覆盖率  每档比例  边际收益');
  for (const r of c.tiers) {
    console.log(`  ${String(r.k).padEnd(4)} ${String(r.coverage + '%').padEnd(7)} ${String(r.perTier + '%').padEnd(9)} ${r.gain === null ? '—' : '+' + r.gain}`);
  }
  console.log(`  → 从 3 档到 6 档只多 ${c.tiers[c.tiers.length - 1].coverage - c.tiers[1].coverage} 个百分点，规格数翻倍，每档都要独立的模具与验证`);
  console.log('');
  console.log('三、维数比与距离集中');
  console.log(`  ${c.lowDims.dims} 维、${c.lowDims.n} 例 → ${(c.lowDims.n / c.lowDims.dims).toFixed(1)}:1`);
  console.log(`  ${c.highDims.dims} 维、${c.highDims.n} 例 → ${(c.highDims.n / c.highDims.dims).toFixed(1)}:1，进入距离集中区`);
  console.log('');
  console.log('四、逐条对照正文判断');
  let bad = 0;
  for (const k of checks(text)) {
    console.log(`  ${k.ok ? '✓' : '✗'} ${k.name}：${k.note}`);
    if (!k.ok) bad += 1;
  }
  console.log('');
  console.log(bad ? `✗ ${bad} 条与正文不一致，正文或脚本需要同步。` : '✓ 全部对上：覆盖率曲线与稳定性指标都由正文现算。');
  console.log('※ 教学样例：ARI 与覆盖率曲线按正文演算设定现算，不对应任何真实数据集或人群。');
  console.log('※ 本章不主张人可以分为几型，也不评价任何既有体质或证候分类体系。');
  return bad;
}

if (require.main === module) process.exitCode = report() ? 1 : 0;

module.exports = { readDoc, tiers, settings, compute, checks, report, DOC, CHAPTER, TITLE };
