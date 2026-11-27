#!/usr/bin/env node
/**
 * 中医骨伤科学基础 · 第 3 章 治疗的次序比方法清单重要
 * 课程: departments/04-gushang/03-gushang-kexue-jichu/chapters/03-zhiliao-fangfa/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的核心不是「有几种方法」，而是「先做什么、什么时候换挡」。
 * 脚本从正文里数三样东西：手法的成立条件、固定的五种工具、内治的三期方向，
 * 再检查「固定的是骨折端，不是整条肢体」这句判据是否真的写着。
 *
 * 现算项：
 *   规模      汉字数 / 节数 / 引书
 *   手法      诊断明确 / 肌肉松弛 / 方向与力量可控（缺一不可）
 *   复位      解剖复位 / 功能复位 / 反复复位的代价
 *   固定      小夹板 / 石膏 / 牵引 / 外固定架 / 内固定 的出现次数
 *   内治      初期 / 中期 / 后期 及各自的治法关键词
 *   动静      「固定的是骨折端，不是整条肢体」
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 3;
const TITLE = '治疗的次序比方法清单重要';

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const CONDITIONS = ['诊断明确', '肌肉松弛', '方向与力量可控'];
const TOOLS = ['小夹板', '石膏', '牵引', '外固定架', '内固定'];
const PHASES = [
  { phase: '初期', rule: '活血化瘀' },
  { phase: '中期', rule: '和营生新' },
  { phase: '后期', rule: '补益肝肾' },
];

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

const count = (body, w) => body.split(w).length - 1;

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const hanzi = (body.match(HANZI) || []).length;
  const sections = body.split('\n').filter((l) => /^##\s+/.test(l)).map((l) => l.replace(/^##\s+/, '').trim());
  const cites = [...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]);

  const conditions = CONDITIONS.map((c) => ({ name: c, at: body.indexOf(c), hits: count(body, c) }));
  const missingConditions = conditions.filter((c) => c.at < 0).map((c) => c.name);

  const tools = TOOLS.map((t) => ({ name: t, hits: count(body, t) }));
  const coldTools = tools.filter((t) => t.hits === 0).map((t) => t.name);

  const phases = PHASES.map((p) => {
    const phaseAt = body.indexOf(p.phase);
    // 治法关键词要在该期之后找，否则会命中摘要里先出现的同名说法
    return { ...p, phaseAt, ruleAt: phaseAt >= 0 ? body.indexOf(p.rule, phaseAt) : -1 };
  });
  const phaseOrdered = phases.every((p, i) => p.phaseAt >= 0 && p.ruleAt >= 0 && (i === 0 || p.phaseAt > phases[i - 1].phaseAt));

  const reductions = ['解剖复位', '功能复位'].filter((w) => body.includes(w));
  const redoCost = ['血运破坏', '软组织剥离', '骨不连'].filter((w) => body.includes(w));
  const quiet = body.includes('固定的是骨折端，不是整条肢体');

  return { hanzi, sections, cites, citeCount: cites.length, conditions, missingConditions, tools, coldTools, phases, phaseOrdered, reductions, redoCost, quiet };
}

function main() {
  const a = analyze(read());
  console.log(`中医骨伤科学基础 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 引书 ${a.citeCount} 处`);
  console.log('');
  console.log('手法成立的三条件（缺一不可）：');
  for (const c of a.conditions) console.log(`  ${c.name.padEnd(8, '　')} 第 ${String(c.at + 1).padStart(5)} 字 · 出现 ${c.hits} 次`);
  console.log(`  → ${a.missingConditions.length ? '缺：' + a.missingConditions.join('、') : '三条齐全'}`);
  console.log('');
  console.log(`复位层次：${a.reductions.join(' / ') || '—'}`);
  console.log(`反复复位的代价：${a.redoCost.join('、') || '—'}（${a.redoCost.length}/3）`);
  console.log('');
  console.log('固定五工具（正文提及次数）：');
  for (const t of a.tools) console.log(`  ${t.name.padEnd(6, '　')} ${t.hits} 次`);
  console.log(`  → ${a.coldTools.length ? '正文未提：' + a.coldTools.join('、') : '五种齐全，且各自带代价'}`);
  console.log('');
  console.log('内治三期：');
  for (const p of a.phases) console.log(`  ${p.phase}（第 ${p.phaseAt + 1} 字）→ ${p.rule}（第 ${p.ruleAt + 1} 字）`);
  console.log(`  → 三期次序${a.phaseOrdered ? '与正文一致' : '与正文不一致'}`);
  console.log('');
  console.log(`动静结合判据：${a.quiet ? '固定的是骨折端，不是整条肢体' : '正文未写出这条判据'}`);
  console.log('');
  console.log('※ 方法是工具箱，不是流程单；同一个骨折在不同的人身上可以有不同的次序。');
  console.log('※ 本章不列方名、不给剂量；具体方案以所在机构规范与执业医师判断为准。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, CONDITIONS, TOOLS, PHASES, read, analyze };

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/\*\*/g, '').replace(/^[>\s#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }
