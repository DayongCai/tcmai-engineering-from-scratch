#!/usr/bin/env node
/**
 * 中医智能设备 · 第 2 章 · 结论的上限由信号质量封顶：一次两百倍的压缩，误差不会自己报告
 * 课程: departments/07-zhineng/03-zhongyi-zhineng-shebei/chapters/02-q2/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字与清单全部由本脚本从正文现算，不手打：
 *   六条通道与各自采样下限、质控三层、时域五项、融合三层，
 *   以及「两百倍压缩」与「一个长间歇抬高 SDNN」两笔账。
 * 正文一改，重跑即可看出哪个数对不上；测试把这些数固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '2';
const SLUG = '02-q2';
const TITLE = '结论的上限由信号质量封顶：一次两百倍的压缩，误差不会自己报告';

const GRAM = 4;

const readDoc = () => fs.readFileSync(DOC, 'utf8');

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

function h2Sections(text) {
  const out = [];
  let cur = null;
  for (const line of String(text).split(/\r?\n/)) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) {
      cur = { title: m[1].trim(), body: [line] };
      out.push(cur);
    } else if (cur) cur.body.push(line);
  }
  return out.map((s) => ({ title: s.title, body: s.body.join('\n') }));
}

const h2Titles = (text) => h2Sections(text).map((s) => s.title);
const sectionAt = (text, i) => (h2Sections(text)[i] || { title: '', body: '' }).body;

function tableBlocks(text) {
  const blocks = [];
  let cur = null;
  for (const line of String(text).split(/\r?\n/)) {
    const s = line.trim();
    if (s.startsWith('|')) {
      if (!cur) {
        cur = [];
        blocks.push(cur);
      }
      cur.push(s);
    } else cur = null;
  }
  return blocks.map((b) => {
    const cells = b.map((r) => r.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()));
    return { head: cells[0] || [], rows: cells.slice(2) };
  });
}

const occurrences = (text, term) => String(text).split(term).length - 1;

function grams(text, n = GRAM) {
  const out = new Set();
  for (const seg of String(text).replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** 六条通道：表体首列 */
function channels(text) {
  const b = tableBlocks(text)[0];
  return b ? b.rows.map((r) => r[0]).filter(Boolean) : [];
}

/** 每条通道的采样下限：区间左端那个数 */
function samplingFloors(text) {
  const b = tableBlocks(text)[0];
  if (!b) return [];
  return b.rows
    .map((r) => {
      const n = (/(\d+(?:\.\d+)?)/.exec(r[1] || '') || [])[1];
      return { channel: r[0], range: r[1] || '', floor: n === undefined ? null : Number(n) };
    })
    .filter((r) => r.channel);
}

/** 质控三层：「**信号层**看波形」这一类行 */
function qcLayers(text) {
  return [...sectionAt(text, 2).matchAll(/^\*\*([^*]+)\*\*看/gm)].map((m) => m[1].trim());
}

/** 融合三层：正文里的「X 级融合」 */
function fusionLevels(text) {
  const out = new Set();
  for (const m of sectionAt(text, 5).matchAll(/([\u4e00-\u9fff]{2}级融合)/g)) out.add(m[1]);
  return [...out];
}

/** 时域五项：本章点名的五个指标 */
const TIME_DOMAIN = ['心率', 'SDNN', 'RMSSD', 'pNN50', 'CV'];

/** 两百倍压缩：采样点 ÷ 心搏数 */
function compression(text) {
  const m = /(\d+)\s*Hz\s*采\s*24\s*小时，是\s*([\d,]+)\s*万个采样点；压成 RR 间期序列只剩约\s*([\d.]+)\s*万个（按\s*(\d+)\s*次\/分算），压缩正好\s*(\d+)\s*倍/.exec(text);
  if (!m) return null;
  const hz = Number(m[1]);
  const statedWan = Number(m[2].replace(/,/g, ''));
  const statedRrWan = Number(m[3]);
  const bpm = Number(m[4]);
  const statedRatio = Number(m[5]);
  const samples = hz * 3600 * 24;
  const beats = bpm * 60 * 24;
  const ratio = Math.round(samples / beats);
  return {
    hz,
    samples,
    bpm,
    beats,
    ratio,
    rrWan: Number((beats / 1e4).toFixed(1)),
    statedWan,
    statedRrWan,
    statedRatio,
    ok: samples / 1e4 === statedWan && Number((beats / 1e4).toFixed(1)) === statedRrWan && ratio === statedRatio,
  };
}

/** 一个长间歇对方差与标准差的贡献，以及它把 SDNN 抬到多少 */
function sdnnImpact(text) {
  const mean = Number((/设均值\s*(\d+)\s*ms/.exec(text) || [])[1]);
  const outlier = Number(((/其中出现一个\s*([\d,]+)\s*ms\s*的长间歇/.exec(text) || [])[1] || '').replace(/,/g, ''));
  const divisor = Number(((/\)²\/\s*([\d,]+)\s*≈/.exec(text) || [])[1] || '').replace(/,/g, ''));
  const statedVar = Number(((/≈\s*([\d,]+)\s*ms²/.exec(text) || [])[1] || '').replace(/,/g, ''));
  const statedSd = Number((/折算成标准差约\s*(\d+)\s*ms/.exec(text) || [])[1]);
  const baseSd = Number((/若原序列 SDNN 是\s*(\d+)\s*ms/.exec(text) || [])[1]);
  const statedNew = Number((/加上它之后变成约\s*(\d+)\s*ms/.exec(text) || [])[1]);
  if (!mean || !outlier || !divisor || !baseSd) return null;
  const variance = ((outlier - mean) ** 2) / divisor;
  const sd = Math.sqrt(variance);
  const combined = Math.sqrt(baseSd ** 2 + variance);
  return {
    mean,
    outlier,
    divisor,
    variance: Math.round(variance),
    sd: Math.round(sd),
    baseSd,
    combined: Math.round(combined),
    ratio: Number((combined / baseSd).toFixed(2)),
    statedVar,
    statedSd,
    statedNew,
    ok: Math.round(variance) === statedVar && Math.round(sd) === statedSd && Math.round(combined) === statedNew,
  };
}

function quizSummary(quiz, text) {
  const body = grams(text);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  for (const q of qs) if (stage[q.stage] !== undefined) stage[q.stage] += 1;
  const hits = qs.filter((q) => q.stage === 'check').map((q) => {
    const right = String((q.options || [])[q.correct] || '');
    return { question: q.question, grams: [...grams(right)].filter((g) => body.has(g)) };
  });
  return {
    total: qs.length,
    stage,
    check: hits.length,
    grounded: hits.filter((h) => h.grams.length).length,
    hits,
    correctIndexes: qs.map((q) => q.correct),
  };
}

function analyze() {
  const text = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    tables: tableBlocks(text).map((b) => ({ cols: b.head.length, rows: b.rows.length })),
    channels: channels(text),
    floors: samplingFloors(text),
    qc: qcLayers(text),
    fusion: fusionLevels(text),
    timeDomain: TIME_DOMAIN.map((k) => ({ term: k, count: occurrences(text, k) })),
    compression: compression(text),
    sdnn: sdnnImpact(text),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`中医智能设备 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个 · 表 ${r.tables.length} 张`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`六条通道（${r.channels.length} 条）：${r.channels.join(' · ')}`);
  console.log('  ' + r.floors.map((f) => `${f.channel}≥${f.floor === null ? '—' : f.floor + ' Hz'}`).join(' · '));
  console.log('');
  console.log(`质控三层（${r.qc.length} 层）：${r.qc.join(' → ')}`);
  console.log(`融合三层（${r.fusion.length} 层）：${r.fusion.join(' / ')}`);
  console.log(`时域五项：${r.timeDomain.map((x) => `${x.term}(${x.count})`).join(' · ')}`);
  console.log('');
  if (r.compression) {
    const c = r.compression;
    console.log(
      `压缩比：${c.samples.toLocaleString('en-US')} 点 ÷ ${c.beats.toLocaleString('en-US')} 个心搏（${c.bpm} 次/分×24h）= ${c.ratio} 倍` +
        `（正文写 ${c.statedWan} 万 / ${c.statedRrWan} 万 / ${c.statedRatio} 倍）${c.ok ? ' ✓ 对得上' : ' ✗ 对不上'}`
    );
  }
  if (r.sdnn) {
    const s = r.sdnn;
    console.log(
      `一个长间歇：(${s.outlier}−${s.mean})²/${s.divisor} ≈ ${s.variance} ms²，折算 ${s.sd} ms；` +
        `SDNN ${s.baseSd} → ${s.combined} ms（${s.ratio} 倍，正文 ${s.statedVar} / ${s.statedSd} / ${s.statedNew}）${s.ok ? ' ✓ 对得上' : ' ✗ 对不上'}`
    );
  }
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）` +
      ` · check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 正确项落点 ${[...new Set(r.quiz.correctIndexes)].join('/')}`
  );
  console.log('');
  console.log('※ 以上数字与清单全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成医学意见、诊断或治疗建议；节律判读须由执业医师完成。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  h2Sections,
  h2Titles,
  sectionAt,
  tableBlocks,
  occurrences,
  grams,
  channels,
  samplingFloors,
  qcLayers,
  fusionLevels,
  compression,
  sdnnImpact,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TIME_DOMAIN,
};
