#!/usr/bin/env node
/**
 * 急危重症护理学 · 第 6 章 多发伤的死有三个高峰，护理各守一段：正文判断卡
 * 课程: departments/05-huli/12-jiwei-zhengzheng-huli/chapters/06-chuangshang-huli/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：汉字数、节与小节、表格与数据行、高峰数、五步、四腔、隐蔽伤与失效模式，
 * 都从本章正文读出；损伤严重度按三个最重部位的平方和逐组算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = '6';
const SLUG = '06-chuangshang-huli';
const TITLE = '多发伤的死有三个高峰，护理各守一段';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const EOL = /\r?\n/;

// 正文的对照算例：同分不同伤，要守的段落完全不同。
const CASES = [
  { label: '三处各三分', scores: [3, 3, 3] },
  { label: '一处五分加两处一分', scores: [5, 1, 1] },
];

const SAMPLES = [
  { text: '小腿一道口子流血，先围着小腿看', note: '被体表伤口吸引' },
  { text: '胸腔、腹腔、腹膜后、长骨逐一查，血压九十五、心率一百二十五、脉压变窄', note: '四腔加一组读' },
  { text: '血压九十五，判定稳定', note: '单次数' },
  { text: '骨盆挤压试验阳性，血压较前下降', note: '找隐蔽伤加趋势' },
  { text: '病人不喊了，睡着了', note: '把恶化当疲惫' },
];

const SKIN = /(小伤口|口子|擦伤|体表伤口)/;
const CAVITY = /(胸腔|腹腔|腹膜后|骨盆|长骨|四腔)/;
const TREND = /(较前|下降|上升|变窄|变快|逐小时)/;
const SINGLE = /(血压[^，。；]{0,6}(稳定|正常)|判定稳定|生命体征平稳)/;
const MISREAD = /(睡着了|不喊了|不配合)/;

function readDoc() { return fs.readFileSync(DOC, 'utf8'); }
function hanzi(text) { return (text.match(/[\u4e00-\u9fff]/g) || []).length; }

function countHeadings(text, prefix) {
  return text.split(EOL).filter((line) => line.startsWith(prefix) && !line.startsWith(prefix + '#')).length;
}

function tableBlocks(lines) {
  const blocks = [];
  let cur = null;
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('|')) {
      if (!cur) { cur = []; blocks.push(cur); }
      cur.push(t);
    } else { cur = null; }
  }
  return blocks;
}

function dataRows(block) {
  return block.filter((l) => !/^\|[\s:\-|]+\|$/.test(l)).slice(1);
}

function sectionText(text, key) {
  const out = [];
  let on = false;
  for (const line of text.split(EOL)) {
    const m = /^##\s+(.*)$/.exec(line);
    if (m) { on = m[1].includes(key); continue; }
    if (on) out.push(line);
  }
  return out.join('\n');
}

function blockOf(text, key) {
  return text.split(/\n(?=## )/).find((c) => c.includes(key)) || '';
}

/** 损伤严重度：三个最重部位的平方和 */
function injuryScore(scores) {
  return scores.reduce((a, b) => a + b * b, 0);
}

/** 四腔：正文「按『四腔』找血：A、B、C、D。」 */
function cavityItems(text) {
  const m = /按「四腔」找血：([^。]+)。/.exec(text);
  return m ? m[1].split('、').map((s) => s.trim()).filter(Boolean) : [];
}

/** 三处隐蔽伤：正文加粗列出的骨盆、脊柱、膈肌与腹膜后 */
function hiddenInjuries(text) {
  return ['**骨盆**', '**脊柱**', '**膈肌与腹膜后**'].filter((k) => text.includes(k));
}

function classify(text) {
  if (MISREAD.test(text)) return '读错';
  if (SKIN.test(text) && !CAVITY.test(text)) return '只看伤口';
  if (CAVITY.test(text) && (TREND.test(text) || /血压/.test(text))) return '按四腔';
  if (SINGLE.test(text)) return '单点式';
  return '缺项';
}

function report() {
  const text = readDoc();
  const lines = text.split(EOL);
  const blocks = tableBlocks(lines);
  const rows = blocks.reduce((n, b) => n + dataRows(b).length, 0);

  const size = {
    hanzi: hanzi(text),
    sections: countHeadings(text, '## '),
    subsections: countHeadings(text, '### '),
    tables: blocks.length,
    rows,
  };

  const peaks = ['**第一个高峰', '**第二个高峰', '**第三个高峰', '**第四个高峰']
    .filter((k) => text.includes(k)).length;
  const steps = ['**第一步，', '**第二步，', '**第三步，', '**第四步，', '**第五步，', '**第六步，']
    .filter((k) => blockOf(text, '分层评估').includes(k)).length;
  const modes = (sectionText(text, '失效模式').match(/失效模式[一二三四五六七八九]/g) || []).length;
  const cavities = cavityItems(text);
  const hidden = hiddenInjuries(text);
  const triad = ['低体温', '酸中毒', '凝血障碍'].filter((k) => text.includes(k));

  const cases = CASES.map((c) => ({ ...c, score: injuryScore(c.scores) }));
  const samples = SAMPLES.map((s) => ({ ...s, kind: classify(s.text) }));

  return {
    chapter: CHAPTER,
    title: TITLE,
    size,
    peaks,
    steps,
    modes,
    cavities,
    hidden,
    triad,
    cases,
    samples,
    ok: samples.filter((s) => s.kind === '按四腔').length,
  };
}

function main() {
  const r = report();
  console.log(`急危重症护理学 · 第 ${r.chapter} 章 ${r.title}`);
  console.log(`正文: chapters/${SLUG}/docs/zh.md`);
  console.log('');
  console.log(`规模: 汉字 ${r.size.hanzi.toLocaleString('en-US')} · 节 ${r.size.sections} · 小节 ${r.size.subsections} · 表格 ${r.size.tables} 张（数据行 ${r.size.rows}）`);
  console.log(`死亡高峰 ${r.peaks} 个；主线 ${r.steps} 步；四腔 ${r.cavities.length} 处 → ${r.cavities.join('、')}；隐蔽伤 ${r.hidden.length} 处；致死三联 ${r.triad.length} 项；失效模式 ${r.modes} 条`);
  console.log('');
  console.log('演算（三个最重部位平方和）:');
  for (const c of r.cases) {
    console.log(`  ${c.label}：${c.scores.join('、')} → ${c.scores.map((s) => s * s).join('＋')} ＝ ${c.score}`);
  }
  console.log(`  → 两组同为 ${r.cases[0].score} 分，前者是三处中等伤，后者是一处危重伤加两处轻伤；按总分排人手会把最该盯的那一处看漏。`);
  console.log('');
  console.log('样例记录（规则逐条判定）:');
  for (const s of r.samples) {
    const mark = s.kind === '按四腔' ? '✅' : '❌';
    console.log(`  ${mark} ${s.kind.padEnd(5)} ← ${s.text}　〔${s.note}〕`);
  }
  console.log('');
  console.log(`结论: ${r.samples.length} 条例句里 ${r.ok} 条先按四腔找血；只盯体表伤口、只读一次血压或把安静当好转，都会漏掉真正的失血点。`);
  console.log('边界声明: 本输出为教学样例，数字由本章正文现算，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, hanzi, countHeadings, tableBlocks, dataRows, sectionText, blockOf, injuryScore, cavityItems, hiddenInjuries, classify, report, SAMPLES, CASES, CHAPTER, SLUG, TITLE };
