#!/usr/bin/env node
/**
 * 中医面部望诊 · 第 3 章 · 目：古籍底本的作者，亲手否掉了五轮
 * 课程: departments/08-wuguan/03-zhongyi-mianbu-wangzhen/chapters/03-e33/docs/zh.md
 * 底本: 《望诊遵经·目分脏腑部位》《眼目形容提纲》《眼目气色提纲》《睑色望法提纲》
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字全部从正文现算：小节顺序、四纲与五轮各几项（从表格里读）、
 * 「视精明」四个词、虹膜像素与噪声预算、quiz 接地情况。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 3;
const SLUG = '03-e33';
const TITLE = '目：古籍底本的作者，亲手否掉了五轮';

/** 各表格的数据行数（不含表头与分隔行），按出现顺序 */
const TABLE_ROWS = [2];

/** 关键判据词 */
const TERMS = [
  '视精明',
  '五轮',
  '四纲',
  '黑白分明',
  '光彩清莹',
  '胆红素',
  '血红蛋白',
  '暴盲',
  '绿风内障',
];

/** 每节一个探针词：第 i 个必须出现在第 i 节 */
const SECTION_PROBES = [
  '神也者',
  '乖夫体用',
  '浅深',
  '露睛',
  '泪膜',
  '未见异常',
  '不判定何者为正',
];

const GRAM = 4;

const readDoc = () => fs.readFileSync(DOC, 'utf8');

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

function h2Titles(text) {
  const out = [];
  for (const line of String(text).split(/\r?\n/)) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) out.push(m[1].trim());
  }
  return out;
}

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

/** 「视精明」那段引文里的四个词：平正 / 分明 / 精爽 / 清莹 */
function jingmingWords(text) {
  const line = String(text).split(/\r?\n/).find((l) => l.includes('神也者，视瞻平正')) || '';
  const inner = (/「([^」]+)」/.exec(line) || [null, ''])[1];
  const parts = inner.split('，').map((s) => s.trim()).filter((s) => /平正|分明|精爽|清莹/.test(s));
  return { quote: inner, words: parts.map((p) => p.replace(/^视瞻/, '').replace(/^容色/, '').replace(/^光彩/, '')) };
}

/** 四纲与五轮：从「体系」那张表读，各自几项由单位数现算 */
function systems(text) {
  const blocks = tableBlocks(text);
  const t = blocks.find((b) => b.head[0] === '体系') || { head: [], rows: [] };
  const pick = (name) => {
    const row = t.rows.find((r) => r[0] === name) || [];
    const cell = String(row[1] || '');
    const items = cell.includes('：') ? cell.slice(cell.indexOf('：') + 1).split('、').map((s) => s.trim()) : [];
    return { name, items, count: items.length, boundary: row[3] || '', unit: row[2] || '' };
  };
  return { table: t, fiveLun: pick('五轮'), fourGang: pick('四纲') };
}

/** 采集量级：虹膜像素、噪声预算、照度、瞳孔直径 */
function eyeFigures(text) {
  const t = String(text);
  const iris = /虹膜直径大约\s*(\d+)–(\d+)\s*像素/.exec(t);
  const irisUsed = /虹膜直径按\s*(\d+)\s*像素计/.exec(t);
  const deltaE = /色度误差控制在\s*ΔE\s*(\d+)/.exec(t);
  const budget = /每个通道的噪声需要压到\s*(\d+)\s*个灰阶/.exec(t);
  const lux = /(\d+)\s*勒克斯照度/.exec(t);
  const noise = /暗部噪声通常在\s*(\d+)–(\d+)\s*个灰阶/.exec(t);
  const pupil = /直径可以从\s*(\d+)\s*毫米降到\s*(\d+)\s*毫米/.exec(t);
  return {
    irisRange: iris ? [Number(iris[1]), Number(iris[2])] : [],
    irisUsed: irisUsed ? Number(irisUsed[1]) : 0,
    deltaE: deltaE ? Number(deltaE[1]) : 0,
    noiseBudget: budget ? Number(budget[1]) : 0,
    lux: lux ? Number(lux[1]) : 0,
    phoneNoise: noise ? [Number(noise[1]), Number(noise[2])] : [],
    pupil: pupil ? [Number(pupil[1]), Number(pupil[2])] : [],
  };
}

/** 气色三量：明暗 / 清浊 / 浅深 */
function threeQs(text) {
  const line = String(text).split(/\r?\n/).find((l) => l.includes('有明暗之辨焉')) || '';
  const inner = (/「([^」]+)」/.exec(line) || [null, ''])[1];
  return { quote: inner, count: ['明暗', '清浊', '浅深'].filter((k) => inner.includes(k)).length };
}

const presentCount = (text, terms) => terms.filter((t) => occurrences(text, t) > 0).length;

function quizSummary(quiz, text) {
  const body = grams(text);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  for (const q of qs) if (stage[q.stage] !== undefined) stage[q.stage] += 1;
  const hits = qs.filter((q) => q.stage === 'check').map((q) => {
    const right = String((q.options || [])[q.correct] || '');
    const hit = [...new Set([...grams(right)].filter((g) => body.has(g)))];
    return { question: q.question, grams: hit, correct: q.correct };
  });
  return {
    total: qs.length,
    stage,
    check: hits.length,
    grounded: hits.filter((h) => h.grams.length >= 2).length,
    hits,
    answers: qs.map((q) => q.correct),
  };
}

function analyze() {
  const text = readDoc();
  const blocks = tableBlocks(text);
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    tables: blocks.map((b) => ({ cols: b.head.length, rows: b.rows.length, first: b.head[0] || '' })),
    terms: TERMS.map((t) => ({ term: t, count: occurrences(text, t) })),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).includes(p) })),
    jingming: jingmingWords(text),
    systems: systems(text),
    figures: eyeFigures(text),
    three: threeQs(text),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`中医面部望诊 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`表格 ${r.tables.length} 张：`);
  r.tables.forEach((t, i) => console.log(`  #${i + 1}  ${t.rows} 行 × ${t.cols} 列  首列表头「${t.first}」`));
  console.log('');
  console.log('关键判据（出现次数）：');
  console.log('  ' + r.terms.map((x) => `${x.term} ${x.count}`).join(' · '));
  console.log('');
  console.log('小节探针：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(`「视精明」四词：${r.jingming.words.join(' / ')}（${r.jingming.words.length} 个）`);
  console.log(
    `五轮 ${r.systems.fiveLun.count} 个互斥区域：${r.systems.fiveLun.items.join('、')}；四纲 ${r.systems.fourGang.count} 个观察维度：${r.systems.fourGang.items.join('、')}`
  );
  console.log(`气色三量：${r.three.count} 个（明暗／清浊／浅深）`);
  const f = r.figures;
  console.log(
    `采集量级：虹膜 ${f.irisRange.join('–')} 像素（按 ${f.irisUsed} 计）；要 ΔE ${f.deltaE} 需噪声 ≤${f.noiseBudget} 灰阶；手机在 ${f.lux} 勒克斯下暗部 ${f.phoneNoise.join('–')} 灰阶；瞳孔 ${f.pupil.join('→')} 毫米`
  );
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）`
  );
  console.log(`答案位置：${r.quiz.answers.join(' / ')}`);
  console.log('');
  console.log('※ 以上数字全部由本章正文现算，改正文后重跑即可复核。');
  console.log('※ 本章为目部望诊的教学材料，不构成诊疗建议、诊断或治疗指导。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  h2Titles,
  h2Sections,
  sectionAt,
  tableBlocks,
  occurrences,
  grams,
  jingmingWords,
  systems,
  eyeFigures,
  threeQs,
  presentCount,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TABLE_ROWS,
  TERMS,
  SECTION_PROBES,
};
