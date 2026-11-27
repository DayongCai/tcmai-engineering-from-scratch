#!/usr/bin/env node
/**
 * 中医知识图谱 · 第 2 章 本体的最底层不该是「学科」，而该是「共祖」
 * 课程: departments/07-zhineng/05-zhongyi-zhishi-tupu/chapters/02-j2/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字从本章正文现算：七步法逐行数、八个院系的学科数相加核对 120、
 * spine 边数按「4 条公理 × 域数」推出、枝数差额由 188 与 120 相减得到。
 * 这些量都能被复算，所以它们是结构自检项，而不是文档里的形容词。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 2;
const TITLE = '本体的最底层不该是「学科」，而该是「共祖」';

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((s) => s.trim());
}

function parseTables(md) {
  const lines = String(md).split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^\s*\|/.test(lines[i])) continue;
    if (i + 1 >= lines.length || !/^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) continue;
    const header = splitRow(lines[i]);
    const rows = [];
    let j = i + 2;
    while (j < lines.length && /^\s*\|/.test(lines[j])) { rows.push(splitRow(lines[j])); j += 1; }
    out.push({ header, rows });
    i = j - 1;
  }
  return out;
}

function num(s) {
  const m = String(s == null ? '' : s).replace(/[,\s]/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

/** 取 ``` 围栏内的文本块，按出现顺序。 */
function fences(md) {
  return [...String(md).matchAll(/```[a-z]*\n([\s\S]*?)```/g)].map((m) => m[1]);
}

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const tables = parseTables(body);

  // 七步法：① 定领域与范围 … ⑦ 实例化与评估
  const stepTable = tables.find((t) => t.header.join('').includes('中医对象'));
  if (!stepTable) throw new Error('正文里没有七步法表');
  const steps = stepTable.rows.map((r) => ({ step: r[0], action: r[1], object: r[2], artifact: r[3] }));

  // 八个院系的学科分布，合计应等于源骨架的枝数
  const domainTable = tables.find((t) => t.header.join('').includes('学科数'));
  if (!domainTable) throw new Error('正文里没有院系学科分布表');
  const domains = domainTable.rows
    .filter((r) => /^D\d{2}$/.test(r[0]))
    .map((r) => ({ id: r[0], name: r[1], subjects: num(r[2]) }));
  const subjectSum = domains.reduce((a, d) => a + d.subjects, 0);

  // 须层六项
  const xuFence = fences(body).find((f) => f.includes('象数阴阳'));
  const xu = xuFence ? xuFence.split('·').map((s) => s.trim()).filter(Boolean) : [];

  // 根层四条公理：正文以 **G1 …** 的列表项列出
  const roots = [...body.matchAll(/^\s*-\s+\*\*(G\d)\s+([^*]+)\*\*/gm)].map((m) => ({ id: m[1], name: m[2].trim() }));

  // 须→根 与 根→干 的边型
  const edgeTable = tables.find((t) => t.header.join('').includes('方向') && t.header.join('').includes('语义'));
  const edgeTypes = edgeTable
    ? edgeTable.rows.map((r) => (r[0].match(/`([a-z_]+)`/) || [])[1]).filter(Boolean)
    : [];

  // 枝数：源 120，本库 188，差额逐条记账而不静默对齐
  const srcBranches = subjectSum;
  const localHit = body.match(/本库\s*(\d+)\s*枝/);
  const localBranches = localHit ? num(localHit[1]) : null;
  const branchGap = localBranches == null ? null : localBranches - srcBranches;

  // 干层域数 → spine 条数 = 4 条公理 × 域数
  const spineSrc = roots.length * domains.length;
  const spineLocal = roots.length * 9;

  // 空枝
  const pendingHit = body.match(/(\d+)\s*门只有枝没有叶/);
  const pendingBranches = pendingHit ? num(pendingHit[1]) : null;

  return {
    body,
    hanzi: (body.match(HANZI) || []).length,
    steps,
    domains,
    subjectSum,
    xu,
    roots,
    edgeTypes,
    srcBranches,
    localBranches,
    branchGap,
    spineSrc,
    spineLocal,
    pendingBranches,
    noSilentAlign: /不静默对齐/.test(body),
    freqRecallOnly: /词频只作召回，不作归属/.test(body),
  };
}

function main() {
  const a = analyze(read());

  console.log(`中医知识图谱 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`正文 ${a.hanzi} 汉字 · 七步法 ${a.steps.length} 步 · 须 ${a.xu.length} 项 · 根 ${a.roots.length} 条`);
  console.log('');
  console.log('七步法逐步行（动作 → 产出物）：');
  for (const s of a.steps) console.log(`  ${s.step} ${s.action.padEnd(10, '　')} → ${s.artifact}`);
  console.log('');
  console.log('八域学科数：');
  for (const d of a.domains) console.log(`  ${d.id} ${d.name.padEnd(8, '　')} ${String(d.subjects).padStart(3)}`);
  console.log(`  → 合计 ${a.subjectSum}（应与源骨架枝数一致）`);
  console.log('');
  console.log(`须层：${a.xu.join(' · ')}`);
  console.log(`根层：${a.roots.map((r) => r.id + ' ' + r.name).join(' · ')}`);
  console.log(`边型：${a.edgeTypes.join(' / ')}`);
  console.log('');
  console.log(`spine 条数自检：${a.roots.length} 条公理 × ${a.domains.length} 域 = ${a.spineSrc}（源）；本库 9 院系 = ${a.spineLocal}`);
  console.log(`枝数：源 ${a.srcBranches} / 本库 ${a.localBranches}，差额 ${a.branchGap}；不静默对齐：${a.noSilentAlign ? '是' : '否'}`);
  console.log(`空枝 ${a.pendingBranches} 门仍只有枝没有叶；学派归属「词频只作召回」：${a.freqRecallOnly ? '已写明' : '未出现'}`);
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本章为知识组织讨论，不涉及病证判断。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, parseTables, fences, num };

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/\*\*/g, '').replace(/^[>\s#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }
