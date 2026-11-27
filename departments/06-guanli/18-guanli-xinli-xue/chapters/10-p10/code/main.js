#!/usr/bin/env node
/**
 * 管理心理学 · 第 10 章 团队不是把能人凑齐，是把互依关系设计出来
 * 课程: departments/06-guanli/18-guanli-xinli-xue/chapters/10-p10/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的账都算得出来，本脚本算四个：
 *   1. 沟通线 = n(n−1)/2：5/10/20 人分别是 10/45/190 条，解释「五至九人」；
 *   2. 贝尔宾九角色从正文表格解析，按行动／人际／思维三类计数，找缺口；
 *   3. 会诊团队的共识落地率（47 例里 11 例改变方案）与「不知道谁落实」的比例；
 *   4. 心理安全的上报量读法：报告升 + 实际差错降 = 安全变好；报告升 + 表单变简 = 流程效应。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 10;
const TITLE = '团队不是把能人凑齐，是把互依关系设计出来';
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

/** 贝尔宾九角色：正文表格「取向／角色／断掉之后的样子」 */
function roles(text) {
  const t = tables(text).find((x) => x.header[0] === '取向') || { rows: [] };
  const list = t.rows.map((r) => ({ orientation: r[0], role: r[1], gap: r[2] }));
  const byOrientation = {};
  for (const r of list) byOrientation[r.orientation] = (byOrientation[r.orientation] || 0) + 1;
  return { list, byOrientation };
}

/** 沟通线：n 人两两相连 */
function lines(n) {
  return Number(((n * (n - 1)) / 2).toFixed(0));
}

/**
 * 规模曲线：从 n 到 n+1，沟通线增加 n 条。
 * 「九人」是经验拐点：第十个人带来的第 9 条线，开始超过边际产出。
 */
function scaleCurve(max = 20) {
  const out = [];
  for (let n = 2; n <= max; n += 1) out.push({ n, lines: lines(n), added: n - 1 });
  return out;
}

/** 共识落地率 */
function landing(total, changed) {
  const rate = Number(((changed / total) * 100).toFixed(2));
  return {
    total,
    changed,
    rate,
    verdict: rate < 30 ? '共识多数停在纸面：缺收尾者与落地授权' : '落地率尚可，仍需追执行',
  };
}

/** 授权三条边界：缺一条就漏一处 */
const BOUNDARIES = ['目标与绩效边界', '权限与资源边界', '伦理与合规边界'];
const EMPOWER_STEPS = ['信息与资源', '方法与决策空间', '责任与后果', '辅导与反馈'];

function boundaryCheck(declared) {
  const missing = BOUNDARIES.filter((b) => !declared.includes(b));
  return {
    declared,
    missing,
    ok: missing.length === 0,
    verdict: missing.length ? '缺 ' + missing.join('、') + '：授权会退化成「出了事你自己担」' : '三条齐，可在边界内自主',
  };
}

/**
 * 上报量读法：报告量测「敢不敢说」，不等于差错多少。
 * reportedUp × actualDown → 心理安全提升；reportedUp × actualUp → 真问题；
 * reportedUp × formSimplified → 流程效应，不能当安全绩效。
 */
function interpretReports({ reportedUp, actualDown, formSimplified }) {
  if (formSimplified) return { read: '流程效应', action: '先把表单前后可比性对齐，再谈安全变化' };
  if (reportedUp && actualDown) return { read: '心理安全提升', action: '保持通道，别把上报数量直接变成考核指标' };
  if (reportedUp && !actualDown) return { read: '真问题暴露', action: '按差错类型查环节，不要压上报' };
  return { read: '可能被压制', action: '先查通道是否顺畅，再看数字' };
}

const CONDITIONS = ['真实团队', '令人信服的方向', '赋能的团队结构', '支持性的组织情境', '专家式教练'];

function concepts(text) {
  const t = String(text || '');
  return {
    conditions: CONDITIONS.filter((c) => t.includes(c)),
    boundaries: BOUNDARIES.filter((b) => t.includes(b)),
    roles: roles(text),
    hasPsychSafety: t.includes('心理安全'),
    hasTuckman: t.includes('塔克曼'),
  };
}

function main() {
  const text = read();
  const c = concepts(text);
  const hanzi = (text.match(HANZI) || []).length;
  const r = roles(text);
  const l = landing(47, 11);
  const curve = scaleCurve(20);

  console.log(`管理心理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi} 字 · 节 ${sections(text).length} 节 · 表格 ${tables(text).length} 张`);
  console.log(`贝尔宾角色 ${r.list.length} 种，取向分布：${Object.entries(r.byOrientation).map(([k, v]) => `${k} ${v}`).join('｜')}`);
  for (const x of r.list) console.log(`  ${x.orientation}｜${x.role}｜缺了：${x.gap}`);
  console.log('');
  console.log('沟通线 n(n−1)/2：');
  for (const n of [5, 10, 20]) console.log(`  ${n} 人 → ${lines(n)} 条`);
  const nine = curve.find((x) => x.n === 9);
  const ten = curve.find((x) => x.n === 10);
  console.log(`  九人 ${nine.lines} 条，第十人再加 ${ten.added} 条 → 规模过了九人，互依收益开始被沟通负担吃掉。`);
  console.log('');
  console.log(`会诊落地率：${l.changed}/${l.total} = ${l.rate}% → ${l.verdict}`);
  const b = boundaryCheck(['目标与绩效边界', '权限与资源边界']);
  console.log(`授权边界体检：${b.verdict}`);
  console.log(`授权四步（顺序不可倒）：${EMPOWER_STEPS.join(' → ')}`);
  console.log('');
  const i1 = interpretReports({ reportedUp: true, actualDown: true, formSimplified: false });
  const i2 = interpretReports({ reportedUp: true, actualDown: false, formSimplified: true });
  console.log(`上报量翻倍（实际差错下降）→ ${i1.read}：${i1.action}`);
  console.log(`上报量翻倍（表单同时变简）→ ${i2.read}：${i2.action}`);
  console.log('');
  console.log(`团队有效性五条件 ${c.conditions.length}/5：${c.conditions.join(' · ')}`);
  console.log('  → 领导者的工作是管条件，不是管人；心理安全不能替代问责。');
  console.log('');
  console.log('边界：本章的团队人数、会诊例数与认同比例均为演算设定；团队设置与授权范围的具体决定须依现行制度。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, sections, tables, roles, lines, scaleCurve, landing, boundaryCheck, interpretReports, concepts, BOUNDARIES, EMPOWER_STEPS, CONDITIONS };

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/^[>\s*#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }
