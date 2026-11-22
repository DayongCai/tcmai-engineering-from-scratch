#!/usr/bin/env node
/**
 * 第 3 章 · 规则库体检：正文自己给出的两条冲突规则，拿来做一次交换律测试
 *
 *   数据: chapters/03-guize-yinqing/docs/zh.md（本章正文，唯一数据源）
 *   运行: node code/main.js
 *
 * 两条规则与它们的前件都从正文原句里取出，不另外编规则：
 *   「脉沉细 + 畏寒 = 阳虚」「脉沉细 + 口干 = 阴虚」
 * 病人同时有两组前件时，按文件顺序命中谁就算谁 —— 换一下顺序，结论是否翻转，
 * 就是本章说的交换律测试。这里只做这一次测试，不评价任何模型的准确率。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const MODES = ['all_of', 'any_of', 'score', 'veto'];

const loadDoc = () => fs.readFileSync(DOC, 'utf8');
const hanzi = (s) => (String(s).match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

function sections(md) {
  const out = [{ heading: '（章首）', body: [] }];
  for (const line of md.split(/\r?\n/)) {
    if (/^##\s+/.test(line)) out.push({ heading: line.replace(/^##\s+/, '').trim(), body: [] });
    else out[out.length - 1].body.push(line);
  }
  return out.map((s) => ({ heading: s.heading, body: s.body.join('\n') }));
}

function tables(md) {
  const out = [];
  let cur = null;
  for (const line of md.split(/\r?\n/)) {
    if (!/^\s*\|.*\|\s*$/.test(line)) { cur = null; continue; }
    if (/^[\s:|-]+$/.test(line.replace(/\|/g, ''))) continue;
    const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (!cur) { cur = { header: cells, rows: [] }; out.push(cur); continue; }
    cur.rows.push(cells);
  }
  return out;
}

function blocks(md, lang) {
  const re = new RegExp('```' + lang + '\\n([\\s\\S]*?)```', 'g');
  return [...md.matchAll(re)].map((m) => m[1].trim());
}

/** 从正文原句里取「前件 = 后件」形式的规则 */
function proseRules(md) {
  const head = sections(md)[0].body;
  const out = [];
  for (const m of head.matchAll(/「([^」=]{2,40})=([^」]{2,12})」/g)) {
    const cond = m[1].split('+').map((s) => s.trim()).filter(Boolean);
    out.push({ cond, then: m[2].trim() });
  }
  return out;
}

/** 前件全部在事实集里才命中；按给定顺序取第一条命中 */
function resolve(rules, facts) {
  for (const r of rules) if (r.cond.every((c) => facts.includes(c))) return r.then;
  return '未覆盖';
}

function ruleBlockModes(md) {
  const text = blocks(md, 'text').join('\n');
  return MODES.filter((m) => new RegExp('mode\\s+' + m).test(text));
}

function audit(md = loadDoc()) {
  const secs = sections(md);
  const rules = proseRules(md);
  const facts = [...new Set(rules.flatMap((r) => r.cond))];
  const both = [...new Set(rules.flatMap((r) => r.cond))];

  const forward = resolve(rules, both);
  const backward = resolve(rules.slice().reverse(), both);
  const unstable = forward !== backward;
  const noneMatched = resolve(rules, ['舌淡', '脉弱']);

  const usedModes = ruleBlockModes(md);
  const declared = MODES.filter((m) => md.includes('`' + m + '`'));
  const t = tables(md);
  const rowsOf = (pred) => { const x = t.find(pred); return x ? x.rows.length : 0; };

  const holeDefaults = ['返回空', '返回第一条规则', '返回最常见的证型'].filter((k) => md.includes(k));
  const missing = [];
  if (rules.length < 2) missing.push(`正文只取出 ${rules.length} 条冲突规则`);
  if (rules.some((r) => !r.cond.length)) missing.push('有规则的condition拆不开');
  if (!unstable) missing.push('交换律测试没能复现顺序依赖');
  if (declared.length < 4) missing.push(`未声明的 mode：${MODES.filter((m) => !declared.includes(m)).join('/')}`);
  if (holeDefaults.length < 3) missing.push('空洞的三种默认行为没有写全');
  if (rowsOf((x) => x.header.some((h) => /冲突消解/.test(h))) !== 4) missing.push('冲突消解表不是四行');
  if (rowsOf((x) => x.header.some((h) => /逻辑强度/.test(h))) !== 4) missing.push('四种形态表不是四行');

  return {
    sections: secs.map((s) => s.heading),
    hanzi: hanzi(md),
    rules,
    facts,
    forward,
    backward,
    unstable,
    noneMatched,
    usedModes,
    declared,
    holeDefaults,
    conflictRows: rowsOf((x) => x.header.some((h) => /冲突类型/.test(h))),
    coverageRows: rowsOf((x) => x.header.some((h) => /状态/.test(h))),
    missing,
  };
}

function main() {
  const a = audit();
  console.log(`本章正文 ${a.sections.length - 1} 节 · ${a.hanzi} 汉字`);
  console.log('');
  console.log(`正文取出的冲突规则：${a.rules.length} 条`);
  for (const r of a.rules) console.log(`  IF ${r.cond.join(' ∧ ')} THEN ${r.then}`);
  console.log(`事实集：${a.facts.join('、')}`);
  console.log('');
  console.log('交换律测试（同一批事实，只重排规则顺序）：');
  console.log(`  原顺序 → ${a.forward}`);
  console.log(`  逆顺序 → ${a.backward}`);
  console.log(`  结论是否翻转：${a.unstable ? '是 —— 输出依赖书写顺序，不依赖证据' : '否'}`);
  console.log(`  无规则命中时：${a.noneMatched}`);
  console.log('');
  console.log(`mode 声明：${a.declared.join(' / ')}`);
  console.log(`示例规则块实际用到：${a.usedModes.join(' / ') || '（无）'}`);
  console.log(`空洞默认行为已写明：${a.holeDefaults.join('、')}`);
  console.log('');
  console.log(a.missing.length ? `缺口 ${a.missing.length} 处：${a.missing.join('；')}` : '缺口 0 处：形态、冲突、空洞三处都有可执行的处置。');
  console.log('');
  console.log('※ 重排测试只跑本章正文给出的两条规则，不涉及其他模型或病例数据。');
  console.log('※ 本章讨论规则引擎与专家系统的工程方法，不构成诊断或治疗建议。');
}

if (require.main === module) main();

module.exports = { DOC, MODES, loadDoc, sections, tables, blocks, proseRules, resolve, audit };
