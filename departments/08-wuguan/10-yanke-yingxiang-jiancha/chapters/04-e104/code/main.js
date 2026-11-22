#!/usr/bin/env node
/**
 * 眼科影像检查 · 第 4 章对账器
 *
 * 数据源：../docs/zh.md（本章正文）、../quiz.json（本章习题）
 *
 * 现算的东西：
 *   1. 可及性三段（通路、断面、灌注）；
 *   2. 四类手段各回答什么（声学、光学断面、眼底照相、造影）；
 *   3. 断面四层判断（连续、厚度、反射、界面）；
 *   4. 七类常见改变与七条禁写；
 *   5. 造影三答；
 *   6. 共识时相窗口（动脉期、静脉期、晚期）——从正文解析成秒，再据此判时相；
 *      计时起点错开会把动脉期读成静脉期，这一条做成函数；
 *   7. 可判读下限（信号强度）与扫描范围；
 *   8. 习题对账。
 *
 * 依赖：仅 node:fs / node:path。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const docText = () => fs.readFileSync(DOC, 'utf8');
const quizData = () => JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
const hanzi = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;

function grams(s, n = 4) {
  const out = new Set();
  for (const seg of String(s || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** 可及性三段：通路、断面、灌注 */
function reachStages(text = docText()) {
  const seg = text.split('分成三段：')[1];
  if (!seg) return [];
  return [...seg.split('。')[0].matchAll(/\*\*(通路|断面|灌注)\*\*/g)].map((m) => m[1]);
}

/** 四类手段：正文用 `- **声学**：` 这类列表项 */
function modalities(text = docText()) {
  return [...text.matchAll(/^- \*\*(声学|光学断面|眼底照相|造影)\*\*：/gm)].map((m) => m[1]);
}

/** 断面四层判断：**连续。** **厚度。** … */
function sectionChecks(text = docText()) {
  return [...text.matchAll(/\*\*(连续|厚度|反射|界面)。\*\*/g)].map((m) => m[1]);
}

/** 七类改变：每一类写成「**X 与 Y**：写「…」；禁写…」 */
function changeKinds(text = docText()) {
  const seg = text.split('以下七类常见改变')[1];
  if (!seg) return [];
  const body = seg.split('七条之外')[0];
  return [...body.matchAll(/\*\*[^*]+\*\*：写「/g)].length;
}

/** 造影三答：灌注、渗漏、屏障 */
function angioAnswers(text = docText()) {
  return [...text.matchAll(/\*\*(灌注|渗漏|屏障)。\*\*/g)].map((m) => m[1]);
}

/** 复查对齐的条数：同一设备、同一拍摄范围与角度、同一时相点、同一读片人 */
function alignRules(text = docText()) {
  const seg = text.split('复查对齐的四条。')[1];
  if (!seg) return [];
  return seg.split('。')[0].replace(/\*\*/g, '').split('、').map((s) => s.trim()).filter(Boolean);
}

const UNIT_SEC = { s: 1, min: 60 };

/** 从正文解析 FFA 时相窗口：[{name, lo, hi, raw}]，单位统一换算成秒 */
function phaseWindows(text = docText()) {
  const re = /(动脉期|静脉期|晚期)\s*(\d+)–(\d+)(s|min)/g;
  const out = [];
  for (const m of text.matchAll(re)) {
    const k = UNIT_SEC[m[4]];
    out.push({ name: m[1], lo: Number(m[2]) * k, hi: Number(m[3]) * k, raw: m[0].replace(/\s+/g, '') });
  }
  return out;
}

/**
 * 按正文的窗口给一个「记录到的时间点」定名。
 * offsetSec 是计时起点比注射晚了几秒：记录 5s、起点晚 6s，真实经过 11s，应读静脉期。
 */
function phaseAt(recordedSec, offsetSec = 0, text = docText()) {
  if (!(recordedSec >= 0)) throw new RangeError('记录时间不能为负');
  const trueSec = recordedSec + offsetSec;
  for (const w of phaseWindows(text)) {
    if (trueSec >= w.lo && trueSec <= w.hi) return w.name;
  }
  return '未入时相窗口';
}

/** 可判读下限：信号强度 ≥40dB */
function signalFloor(text = docText()) {
  const m = /信号强度\s*≥\s*(\d+)\s*dB/.exec(text);
  return m ? Number(m[1]) : null;
}

/** 正文给出的扫描范围（去重，保序） */
function scanFrames(text = docText()) {
  const out = [];
  for (const m of text.matchAll(/(\d+)mm×(\d+)mm/g)) {
    const s = `${m[1]}mm×${m[2]}mm`;
    if (!out.includes(s)) out.push(s);
  }
  return out;
}

function quizAudit() {
  const q = quizData();
  const body = grams(docText());
  const qs = Array.isArray(q.questions) ? q.questions : [];
  const byStage = { pre: 0, check: 0, post: 0 };
  const problems = [];
  let grounded = 0;

  qs.forEach((item, i) => {
    const n = i + 1;
    if (item.stage in byStage) byStage[item.stage] += 1;
    else problems.push(`第 ${n} 题 stage 非法：${item.stage}`);
    const opts = Array.isArray(item.options) ? item.options : [];
    if (opts.length !== 4) problems.push(`第 ${n} 题有 ${opts.length} 个选项`);
    if (!(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < opts.length)) {
      problems.push(`第 ${n} 题 correct 下标非法`);
    }
    if (hanzi(item.explain) < 30) problems.push(`第 ${n} 题 explain 只有 ${hanzi(item.explain)} 汉字`);
    if (item.stage === 'check') {
      const right = String(opts[item.correct] || '');
      if ([...grams(right)].some((g) => body.has(g))) grounded += 1;
    }
  });

  return { total: qs.length, byStage, grounded, problems };
}

function main() {
  const text = docText();
  const a = quizAudit();
  const wins = phaseWindows(text);

  console.log('眼科影像检查 · 第 4 章 对账');
  console.log('');
  console.log(`可及性三段：${reachStages(text).join(' → ')}`);
  console.log(`四类手段：${modalities(text).join('、')}`);
  console.log(`断面四层判断：${sectionChecks(text).join(' → ')}`);
  console.log(`常见改变：${changeKinds(text)} 类；造影三答：${angioAnswers(text).join('、')}`);
  console.log(`复查对齐：${alignRules(text).join('、')}（${alignRules(text).length} 条）`);
  console.log('');
  console.log(`时相窗口：${wins.map((w) => `${w.name} ${w.lo}–${w.hi}s`).join('；')}`);
  console.log(`记录 5s、计时晚 6s → ${phaseAt(5, 6)}；记录 15s、未偏移 → ${phaseAt(15)}`);
  console.log(`可判读下限：≥${signalFloor(text)}dB；扫描范围：${scanFrames(text).join('、')}`);
  console.log('');
  console.log(`习题 ${a.total} 题（pre ${a.byStage.pre} / check ${a.byStage.check} / post ${a.byStage.post}）`);
  console.log(`check 题正确选项能在正文找到原词的：${a.grounded} 道`);
  console.log(a.problems.length ? `✗ ${a.problems.length} 处：${a.problems.join('；')}` : '✓ 结构齐、解释够长、判据落在正文');
  console.log('');
  console.log('※ 数字由本章正文现算，不手打；正文改动后重跑即可复现。');
}

if (require.main === module) main();

module.exports = {
  docText,
  quizData,
  hanzi,
  grams,
  reachStages,
  modalities,
  sectionChecks,
  changeKinds,
  angioAnswers,
  alignRules,
  phaseWindows,
  phaseAt,
  signalFloor,
  scanFrames,
  quizAudit,
};
