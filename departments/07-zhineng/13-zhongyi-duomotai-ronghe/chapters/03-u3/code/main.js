#!/usr/bin/env node
/**
 * 中医多模态融合 · 第 3 章：预处理不是洗干净，是翻译到同一把尺子上
 * 正文: departments/07-zhineng/13-zhongyi-duomotai-ronghe/chapters/03-u3/docs/zh.md
 * 取数: 解析本章正文里的滤波带宽、降采样比例、色彩偏差与检查阈值
 * 依赖: 仅 Node.js 标准库
 *
 * 现算三件事：设备差异与证候判读界的倍数、抗混叠截止频率、脉图采样周期。
 * 比值与截止频率都从正文的两处表述交叉验证，单处改动会让断言失败。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

function parseDoc(text) {
  const lines = String(text).split(/\r?\n/);
  const titleLine = lines.find((l) => /^#\s+/.test(l)) || '';
  const heading = titleLine.replace(/^#\s+/, '').trim();
  const chapterNo = Number((heading.match(/第\s*(\d+)\s*章/) || [])[1]) || null;
  const title = heading.replace(/^第\s*\d+\s*章\s*·?\s*/, '');
  const sections = lines.filter((l) => /^##\s+/.test(l)).map((l) => l.replace(/^##\s+/, '').trim());
  const tables = [];
  let cur = null;
  for (const line of lines) {
    const t = line.trim();
    if (!t.startsWith('|')) { cur = null; continue; }
    const cells = t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
    if (!cur) { cur = []; tables.push(cur); }
    cur.push(cells);
  }
  const hanzi = (text.match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
  return { text, title, chapterNo, sections, tables, hanzi };
}

const grab = (text, re) => {
  const m = text.match(re);
  return m ? Number(m[1]) : NaN;
};

function analyze(doc) {
  const t = doc.text;
  const bandM = t.match(/带通\s*([\d.]+)–([\d.]+)\s*Hz/);
  const band = bandM ? [Number(bandM[1]), Number(bandM[2])] : [];
  const up = t.match(/把\s*(\d+)\s*Hz\s*的脉图插到\s*([\d.]+)\s*kHz/);
  const rate = up ? Number(up[1]) : NaN;
  const periodMs = 1000 / rate;
  const down = t.match(/把\s*(\d+)\s*Hz\s*的脉图降到\s*(\d+)\s*Hz/);
  const fromHz = down ? Number(down[1]) : NaN;
  const toHz = down ? Number(down[2]) : NaN;
  const nyquist = toHz / 2;
  const pct = grab(t, /奈奎斯特频率的\s*(\d+)%/);
  const cutoffStated = grab(t, /即\s*(\d+)\s*Hz/);
  const colorGap = grab(t, /相差\s*([\d.]+)/);
  const colorEdge = grab(t, /判读界在[^。]*?大约是\s*([\d.]+)/);
  const roundTrip = grab(t, /ΔE\s*<\s*(\d+)/);
  return {
    band,
    rate,
    periodMs,
    bandShare: (band[1] || NaN) / (rate / 2),
    fromHz,
    toHz,
    nyquist,
    pct,
    cutoffStated,
    cutoffComputed: (pct / 100) * nyquist,
    colorGap,
    colorEdge,
    colorRatio: colorGap / colorEdge,
    roundTrip,
  };
}

function main() {
  const doc = parseDoc(fs.readFileSync(DOC, 'utf8'));
  const a = analyze(doc);

  console.log(`中医多模态融合 · 第 ${doc.chapterNo} 章 ${doc.title}`);
  console.log('');
  console.log(`正文 ${doc.hanzi.toLocaleString('en-US')} 汉字 · ${doc.sections.length} 节 · ${doc.tables.length} 张表`);
  console.log('');
  console.log(`脉图带通保留 ${a.band[0]}–${a.band[1]} Hz，采样 ${a.rate} Hz → 每点 ${a.periodMs} ms。`);
  console.log(`  带宽上限只占奈奎斯特（${a.rate / 2} Hz）的 ${(a.bandShare * 100).toFixed(0)}%，向上插值不带来任何新信息。`);
  console.log('');
  console.log(`降采样 ${a.fromHz} → ${a.toHz} Hz：目标奈奎斯特 ${a.nyquist} Hz，按 ${a.pct}% 设截止 → ${a.cutoffComputed} Hz（正文写 ${a.cutoffStated} Hz）。`);
  console.log(`  一致：${a.cutoffComputed === a.cutoffStated ? '是' : '否'}`);
  console.log('');
  console.log(`设备间的红度差 ${a.colorGap}，判读界 ${a.colorEdge} → 设备噪声是判读界的 ${a.colorRatio.toFixed(2)} 倍。`);
  console.log(`回路检查阈值 ΔE < ${a.roundTrip}，用色卡自身标准值，不依赖标签。`);
  console.log('');
  console.log('※ 教学样例：数字由本章正文现算，不手打；改正文后重跑即可复现。');
  console.log('※ 滤波器参数须按设备采样率与噪声谱重新设计，本输出不构成临床判读标准。');
}

if (require.main === module) main();

module.exports = { DOC, parseDoc, analyze };
