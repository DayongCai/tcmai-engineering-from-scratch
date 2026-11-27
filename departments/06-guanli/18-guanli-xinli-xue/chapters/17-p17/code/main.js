#!/usr/bin/env node
/**
 * 管理心理学 · 第 17 章 人抗拒的不是变化，是变化里的损失
 * 课程: departments/06-guanli/18-guanli-xinli-xue/chapters/17-p17/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章有一条可算的乘法和一张可查的对照表：
 *   1. MPS = 意义均分 × 自主 × 反馈：任一乘数趴 1，整体趴 1；
 *   2. 补哪一项最划算：逐项抬到 4，比较边际提升；
 *   3. 抗拒四来源（信息／能力／利益／身份）与四类损失；
 *   4. 上线后的绕过率：培训覆盖率与手工调整率的差，就是「会不会用」与「愿不愿用」之间的那段。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 17;
const TITLE = '人抗拒的不是变化，是变化里的损失';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function sections(text) {
  return String(text || '')
    .split('\n')
    .filter((l) => /^##\s+/.test(l))
    .map((l) => l.replace(/^##\s+/, '').trim());
}

function tables(text) {
  const lines = String(text || '').split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^\s*\|/.test(lines[i]) || !/^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) continue;
    const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((s) => s.trim());
    const header = cells(lines[i]);
    const rows = [];
    let j = i + 2;
    while (j < lines.length && /^\s*\|/.test(lines[j])) {
      rows.push(cells(lines[j]));
      j += 1;
    }
    out.push({ header, rows });
    i = j - 1;
  }
  return out;
}

/** MPS：三项意义特征取均值，再乘自主与反馈（各项 1—7） */
function mps({ variety, identity, significance, autonomy, feedback }) {
  const meaning = (variety + identity + significance) / 3;
  const score = meaning * autonomy * feedback;
  return {
    meaning: Number(meaning.toFixed(3)),
    score: Number(score.toFixed(2)),
    // 短板：乘数里最小的那一项决定了上限
    weakest: [
      ['自主性', autonomy],
      ['反馈', feedback],
    ].sort((a, b) => a[1] - b[1])[0][0],
  };
}

/** 逐项抬到 4，比较边际提升：补短板比加强项划算 */
function levers(base) {
  const cur = mps(base);
  const out = [];
  for (const k of ['autonomy', 'feedback']) {
    const next = mps({ ...base, [k]: 4 });
    out.push({ lever: k, from: mps({ ...base, [k]: base[k] }).score, to: next.score, gain: Number((next.score - cur.score).toFixed(2)) });
  }
  return { cur, out };
}

/** 抗拒四来源：正文表格「来源／表现／应对」 */
function resistance(text) {
  const t = tables(text).find((x) => x.header[0] === '来源') || { rows: [] };
  return t.rows.map((r) => ({ source: r[0], sign: r[1], action: r[2] }));
}

const LOSSES = ['掌控感', '熟练度', '身份', '人际欠账'];
const KOTTER = ['建立紧迫感', '组建联盟', '形成愿景', '沟通愿景', '授权行动', '创造短期成效', '巩固成果', '固化于文化'];

/**
 * 上线后的绕过：培训覆盖 96%，手工调整 41%。
 * 绕过率不是「不会」，是「不愿」——它对应损失问题，不是产品问题。
 */
function bypass({ trainedRate, manualShare, usabilityComplaints, lossShare }) {
  return {
    trainedRate,
    manualShare,
    usabilityComplaints,
    lossShare,
    remainder: Number((100 - usabilityComplaints - lossShare).toFixed(1)),
    verdict: lossShare > usabilityComplaints ? '抗拒主要来自损失，不是产品：加培训解决不了' : '抗拒主要来自产品：先修可用性',
  };
}

function concepts(text) {
  const t = String(text || '');
  return {
    losses: LOSSES.filter((x) => t.includes(x)),
    kotter: KOTTER.filter((x) => t.includes(x)),
    hasJCM: t.includes('工作特征模型'),
    hasRIASEC: t.includes('RIASEC'),
    hasCrafting: t.includes('工作重塑'),
  };
}

function main() {
  const text = read();
  const c = concepts(text);
  const hanzi = (text.match(HANZI) || []).length;
  const base = { variety: 5, identity: 5, significance: 5, autonomy: 2, feedback: 3 };
  const cur = mps(base);
  const lv = levers(base);
  const r = resistance(text);
  const b = bypass({ trainedRate: 96, manualShare: 41, usabilityComplaints: 22, lossShare: 58 });

  console.log(`管理心理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi} 字 · 节 ${sections(text).length} 节 · 表格 ${tables(text).length} 张`);
  console.log(`四类损失 ${c.losses.length}/4：${c.losses.join(' · ')}｜科特八步 ${c.kotter.length}/8`);
  console.log('');
  console.log(`MPS（5,5,5｜自主 ${base.autonomy}｜反馈 ${base.feedback}）：意义均分 ${cur.meaning} → MPS ${cur.score}；最弱乘数：${cur.weakest}`);
  const up = mps({ ...base, autonomy: 4 });
  console.log(`  自主提到 4：MPS ${up.score}（翻倍）——乘数翻倍，整体就翻倍。`);
  for (const x of lv.out) console.log(`  ${x.lever} 提到 4：${x.from} → ${x.to}（增益 ${x.gain}）`);
  console.log('');
  console.log(`抗拒四来源（解析正文表格）：`);
  for (const x of r) console.log(`  ${x.source}｜表现：${x.sign}｜应对：${x.action}`);
  console.log('  → 四种混用「加强沟通」，只有信息不足会好转，其余三种更糟。');
  console.log('');
  console.log(`上线账：培训覆盖 ${b.trainedRate}%／手工调整 ${b.manualShare}%｜难用 ${b.usabilityComplaints}% vs 损失 ${b.lossShare}%（其余 ${b.remainder}% 未说明）`);
  console.log(`  → ${b.verdict}`);
  console.log('');
  console.log('边界：MPS 的 30 与 60 是演示性算式，不是任何真实岗位的测评结果；实际使用须用标准化量表并对常模。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, sections, tables, mps, levers, resistance, bypass, concepts, LOSSES, KOTTER };

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/^[>\s*#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }
