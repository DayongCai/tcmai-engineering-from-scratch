#!/usr/bin/env node
/**
 * 脉诊客观化 · 第 1 章 脉象采集：机器接得住波形，接不住「按到什么程度」
 * 课程: departments/07-zhineng/08-maizhen-keguanhua/chapters/01-m1/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 输出全部从本章正文现算：汉字数、节数、表格张数与行数、采集网格的维数乘积、
 * 单侧位点数、质控判据条数、协议字段类别数、采样率与主能量频带的倍数关系。
 * 正文一改，这里跟着变；手打的数字会在改稿后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 1;
const TITLE = '脉象采集：机器接得住波形，接不住「按到什么程度」';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

/** 二级标题分节：[{title, body, hanzi}] */
function sections(text) {
  const out = [];
  let cur = { title: '（题解）', lines: [] };
  for (const line of String(text).split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      out.push(cur);
      cur = { title: h[1], lines: [] };
      continue;
    }
    cur.lines.push(line);
  }
  out.push(cur);
  return out.map((s) => {
    const body = s.lines.join('\n');
    return { title: s.title, body, hanzi: (body.match(HANZI) || []).length };
  });
}

/** 解析 Markdown 表格：[{header:[], rows:[[]]}]，按出现顺序 */
function tables(text) {
  const lines = String(text).split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    if (!/^\s*\|/.test(lines[i])) { i += 1; continue; }
    const block = [];
    while (i < lines.length && /^\s*\|/.test(lines[i])) { block.push(lines[i]); i += 1; }
    if (block.length < 3) continue;
    const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    if (!/^\s*\|[\s:|-]+\|\s*$/.test(block[1])) continue;
    out.push({ header: cells(block[0]), rows: block.slice(2).map(cells) });
  }
  return out;
}

const num = (s) => {
  const m = String(s).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : NaN;
};

/**
 * 从正文取数：
 *   grid      采集网格 —— 维度表里每一维的取值个数相乘（手 2 × 部 3 × 候 3 × 手法 2）
 *   perSide   单侧位点数 —— 部数 × 候数（手只取一侧）
 *   channels  通道表行数
 *   devices   装置表行数
 *   qc        四、节里编号列的条数
 *   fields    五、节协议表的字段类别数
 *   rate      采样率的上下限（从「100 至 250 Hz」读）
 *   band      主能量频带上限（从「10 Hz 以内」读）
 */
function analyze(text) {
  const body = String(text).replace(/\r\n/g, '\n');
  const tbl = tables(body);
  const hanzi = (body.match(HANZI) || []).length;
  const secs = sections(body);

  const dimT = tbl.find((t) => t.header.join('').includes('取值'));
  const dims = dimT ? dimT.rows.map((r) => num(r[2])).filter(Number.isFinite) : [];
  const grid = dims.reduce((a, b) => a * b, 1);
  const perSide = (dims[1] || NaN) * (dims[2] || NaN);

  const chT = tbl.find((t) => t.header.join('').includes('物理量'));
  const devT = tbl.find((t) => t.header.join('').includes('做法'));

  const qcSec = secs.find((s) => /信号质控/.test(s.title));
  const qc = qcSec ? (qcSec.body.match(/^\s*\d+\.\s+/gm) || []).length : 0;

  const protoSec = secs.find((s) => /采集协议/.test(s.title));
  const protoT = tables(protoSec ? protoSec.body : '').find((t) => t.header.includes('字段'));
  const fields = protoT ? protoT.rows.length : 0;

  const rateM = body.match(/(\d+)\s*至\s*(\d+)\s*Hz/);
  const bandM = body.match(/(\d+)\s*Hz\s*以内/);

  return {
    hanzi,
    sections: secs.filter((s) => s.title !== '（题解）'),
    tables: tbl.length,
    dims,
    grid,
    perSide,
    channels: chT ? chT.rows : [],
    devices: devT ? devT.rows.length : 0,
    qc,
    fields,
    rate: rateM ? { min: Number(rateM[1]), max: Number(rateM[2]) } : null,
    band: bandM ? Number(bandM[1]) : null,
  };
}

/** 采样率相对主能量频带的余量倍数：最保守取上限频带 */
function rateMargin(rate, band) {
  if (!rate || !band) return null;
  return { low: rate.min / band, high: rate.max / band };
}

function main() {
  const text = read();
  const a = analyze(text);
  const m = rateMargin(a.rate, a.band);
  const fattest = a.sections.reduce((x, y) => (y.hanzi > x.hanzi ? y : x), a.sections[0]);

  console.log(`脉诊客观化 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 表格 ${a.tables} 张`);
  console.log(`最长一节：${fattest.title}（${fattest.hanzi} 字）`);
  console.log('');
  console.log(`采集网格：${a.dims.join(' × ')} ＝ ${a.grid} 个格`);
  console.log(`单侧位点数：部 × 候 ＝ ${a.perSide} 个（本章按左侧计，右侧同数）`);
  console.log('');
  console.log(`通道 ${a.channels.length} 路 · 装置 ${a.devices} 类 · 质控判据 ${a.qc} 条 · 协议字段 ${a.fields} 类`);
  console.log('');
  if (m) {
    console.log(`采样率 ${a.rate.min} 至 ${a.rate.max} Hz，主能量在 ${a.band} Hz 以内`);
    console.log(`  → 上限约为主能量上限的 ${m.low} 至 ${m.high} 倍（工程余量，不是标准）`);
  }
  console.log('');
  console.log('※ 网格、位点数、表格行数都由本章正文的表格现算，正文改一个字这里就变。');
  console.log('※ 本章不给设备推荐，也不引用任何实测灵敏度；采集参数以设备说明书与机构作业规范为准。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, sections, tables, rateMargin };

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/\*\*/g, '').replace(/^[>\s#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }
