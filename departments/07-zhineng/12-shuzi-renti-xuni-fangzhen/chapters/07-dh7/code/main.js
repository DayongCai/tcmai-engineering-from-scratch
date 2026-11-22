#!/usr/bin/env node
/**
 * 数字人体虚拟仿真 · 第 7 章 可视化不是把模型画出来，而是把不确定度摆到台面上
 * 课程: departments/07-zhineng/12-shuzi-renti-xuni-fangzhen/chapters/07-dh7/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的帧预算、灰阶落差与触觉更新率都从正文现算：
 * 读正文给出的体数据尺寸、目标帧率、CT 值范围与两种循环频率，复算单帧预算与每级灰阶承担的 HU 数。
 * 本章的判断：预算决定系统能长成什么样，降级必须可见。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 7;
const TITLE = '可视化不是把模型画出来，而是把不确定度摆到台面上';
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

/** 正文设定：体数据尺寸、体素字节、目标帧率、CT 值范围、两种循环频率。 */
function settings(text) {
  const v = pick(text, /(\d+)×(\d+)×(\d+)\s*的体数据/, '体数据尺寸');
  return {
    grid: [Number(v[1]), Number(v[2]), Number(v[3])],
    bytesPerVoxel: Number(pick(text, /每体素\s*(\d+)\s*字节/, '体素字节数')[1]),
    statedMb: Number(pick(text, /就是\s*(\d+)\s*MB/, '正文体数据存贮量')[1]),
    fps: Number(pick(text, /(\d+)\s*帧每秒/, '目标帧率')[1]),
    frameBudgetMs: Number(pick(text, /预算只有\s*([\d.]+)\s*ms/, '正文单帧预算')[1]),
    huLow: -Number(pick(text, /跨越约\s*−(\d+)\s*至/, 'CT 值下限')[1]),
    huHigh: Number(pick(text, /至\s*([\d]+)，即/, 'CT 值上限')[1]),
    statedLevels: Number(pick(text, /即\s*([\d,]+)\s*个灰阶/, '正文灰阶数')[1].replace(/,/g, '')),
    displayBits: Number(pick(text, /普通显示器是\s*(\d+)\s*bit/, '显示器位数')[1]),
    statedPerLevel: Number(pick(text, /每一级显示灰阶要承担\s*(\d+)\s*个\s*HU/, '每级灰阶承担的 HU')[1]),
    latencyLagMs: Number(pick(text, /帧间隔超过\s*(\d+)\s*ms\s*会明显感到迟滞/, '迟滞阈值')[1]),
    latencyBreakMs: Number(pick(text, /超过\s*(\d+)\s*ms\s*会破坏操作节奏/, '操作节奏阈值')[1]),
    hapticKhz: Number(pick(text, /(\d+)\s*赫兹级的更新率|千赫兹级的更新率/, '触觉更新率')[1] || 1),
  };
}

function compute(text) {
  const s = settings(text);
  const voxels = s.grid[0] * s.grid[1] * s.grid[2];
  const bytes = voxels * s.bytesPerVoxel;
  const mib = bytes / 1024 ** 2;
  const frameMs = 1000 / s.fps;
  const huSpan = s.huHigh - s.huLow + 1;
  const displayLevels = 2 ** s.displayBits;
  const perLevel = huSpan / displayLevels;
  const hapticMs = 1000 / (s.hapticKhz * 1000);
  return {
    ...s,
    voxels,
    bytes,
    mib,
    frameMs,
    huSpan,
    displayLevels,
    perLevel,
    hapticMs,
    hapticToVisual: frameMs / hapticMs,
    raysPerFrame: s.grid[0] * s.grid[1],
    samplesPerFrame: voxels,
    hanzi: (text.match(HANZI) || []).length,
  };
}

function checks(text) {
  const c = compute(text);
  const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-9);
  return [
    {
      name: '体数据存贮量按尺寸与字节数现算',
      ok: rel(c.mib, c.statedMb) < 0.01,
      note: `${c.grid.join('×')} × ${c.bytesPerVoxel} = ${c.bytes.toLocaleString('en-US')} 字节 = ${c.mib.toFixed(0)} MiB（正文 ${c.statedMb} MB）`,
    },
    {
      name: '单帧预算 = 1000 ÷ 帧率',
      ok: Math.abs(c.frameMs - c.frameBudgetMs) < 0.05,
      note: `1000 ÷ ${c.fps} = ${c.frameMs.toFixed(2)} ms（正文 ${c.frameBudgetMs} ms）`,
    },
    {
      name: 'CT 灰阶数由上下限决定',
      ok: c.huSpan === c.statedLevels && c.huSpan === 4096,
      note: `${c.huHigh} − (${c.huLow}) + 1 = ${c.huSpan} 级（正文 ${c.statedLevels}；12 bit）`,
    },
    {
      name: '每级显示灰阶承担的 HU 差',
      ok: Math.abs(c.perLevel - c.statedPerLevel) < 0.5,
      note: `${c.huSpan} ÷ ${c.displayLevels} = ${c.perLevel.toFixed(0)} 个 HU（正文 ${c.statedPerLevel}）`,
    },
    {
      name: '触觉循环比视觉快一个量级',
      ok: c.hapticToVisual > 10 && c.hapticToVisual < 25,
      note: `视觉 ${c.frameMs.toFixed(1)} ms／帧 对 触觉 ${c.hapticMs} ms／步 → 快 ${c.hapticToVisual.toFixed(1)} 倍`,
    },
    {
      name: '单帧采样次数足以判定必须上 GPU',
      ok: c.samplesPerFrame >= 1e8,
      note: `${c.grid[0]}² 条光线 × ${c.grid[2]} 步 = ${(c.samplesPerFrame / 1e8).toFixed(2)}×10⁸ 次/帧`,
    },
    {
      name: '迟滞阈值与节奏阈值差两倍',
      ok: c.latencyBreakMs === 2 * c.latencyLagMs && c.latencyLagMs >= 5 * c.frameMs,
      note: `${c.latencyLagMs} ms 迟滞、${c.latencyBreakMs} ms 破坏节奏；分别相当于 ${(c.latencyLagMs / c.frameMs).toFixed(0)} 帧与 ${(c.latencyBreakMs / c.frameMs).toFixed(0)} 帧预算`,
    },
  ];
}

function report() {
  const text = readDoc();
  const c = compute(text);
  console.log(`数字人体虚拟仿真 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('');
  console.log(`正文 ${c.hanzi.toLocaleString('en-US')} 汉字；体数据 ${c.grid.join('×')}。`);
  console.log('');
  console.log('一、存贮与帧预算');
  console.log(`  ${c.bytes.toLocaleString('en-US')} 字节 = ${c.mib.toFixed(0)} MiB`);
  console.log(`  ${c.fps} 帧每秒 → 单帧 ${c.frameMs.toFixed(2)} ms`);
  console.log(`  单帧采样 ${(c.samplesPerFrame / 1e8).toFixed(2)}×10⁸ 次 → CPU 不可能实时，必须上 GPU 并用降采样或空域跳跃`);
  console.log('');
  console.log('二、显示环节：图对，屏不对');
  console.log(`  CT 值 ${c.huLow} 至 ${c.huHigh} → ${c.huSpan} 级灰阶（12 bit）`);
  console.log(`  普通显示器 ${c.displayBits} bit = ${c.displayLevels} 级 → 每级承担 ${c.perLevel.toFixed(0)} 个 HU`);
  console.log(`  → 相差 10 HU 的两块组织，在屏上可能是同一个颜色；报图必须给窗宽窗位`);
  console.log('');
  console.log('三、交互：视觉与触觉的频率差');
  console.log(`  视觉 ${c.frameMs.toFixed(1)} ms／帧；触觉 ${c.hapticKhz} kHz = ${c.hapticMs} ms／步 → 快 ${c.hapticToVisual.toFixed(1)} 倍`);
  console.log(`  迟滞 ${c.latencyLagMs} ms、破坏节奏 ${c.latencyBreakMs} ms：两个循环必须解耦`);
  console.log('');
  console.log('四、逐条对照正文数字');
  let bad = 0;
  for (const k of checks(text)) {
    console.log(`  ${k.ok ? '✓' : '✗'} ${k.name}：${k.note}`);
    if (!k.ok) bad += 1;
  }
  console.log('');
  console.log(bad ? `✗ ${bad} 条与正文不一致，正文或脚本需要同步。` : '✓ 全部对上：存贮、预算与灰阶落差都由正文设定现算。');
  console.log('※ 教学样例：尺寸、帧率与灰阶按正文量级估算现算，不对应任何具体软硬件配置。');
  console.log('※ 本章不给教学效果数值，涉及术中的显示与导航属医疗器械范畴。');
  return bad;
}

if (require.main === module) process.exitCode = report() ? 1 : 0;

module.exports = { readDoc, settings, compute, checks, report, DOC, CHAPTER, TITLE };
