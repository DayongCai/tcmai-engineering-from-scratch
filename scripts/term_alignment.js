#!/usr/bin/env node
/**
 * scripts/term_alignment.js —— ICD-11 合称 → 国家证名表通行证名的对齐表（口径：取主构件）
 *
 * 为什么要有这张表：
 *   7 条 `component` 级的证名在中文文献里连"整串"都写不出来 —— 2026-10-30 用
 *   《中医疾病名代码（医保版 GB95 / 医保 2.0 版 GB21）》全表核验：7 条合称**一条都不在标准表里**，
 *   其中 4 个构件（邪留正伤 / 瘀毒内蕴 / 瘀毒内结 / 痰湿阻窍）连单名都不在。
 *   继续按词面检索是结构性的空手，平台层要引用时只能落到「通行证名」。
 *
 * 三条边界（写在代码里，避免以后又被当成证据用）：
 *   1. **对齐不是证据**：本表不写 external.json，不改 externalScope，不计入任何覆盖数。
 *   2. **取主构件**：合称按 `、`／`/` 切分，首构件为主构件；合称本身不给正名（wholeStandardName 恒 null）。
 *   3. **代码不推测**：只在表内「代码 + 证名」同行相邻时写，否则 null。
 *
 * 用法：
 *   node scripts/term_alignment.js           # 打印对齐表
 *   node scripts/term_alignment.js --check   # 跑门（失败退出码 1）
 *   node scripts/term_alignment.js --json    # 输出 {label: entry}
 */

const fs = require('fs');
const path = require('path');
const L = require('./lib_evidence_scope.js');

const ROOT = path.join(__dirname, '..');
const ALIGN = path.join(ROOT, 'standards/semtensor/descriptions/term-alignment.json');
const EXT = path.join(ROOT, 'standards/semtensor/descriptions/external.json');

const CODE_RE = /^[A-Z]\d{2}(?:\.\d+)+$/;      // 国标/医保码：B04.02.01.02.02.02
const WHO_RE = /^\d+(?:\.\d+)+$/;              // WHO-TCM 码：2.9.90（**不是**这一套）

function load() {
  const table = JSON.parse(fs.readFileSync(ALIGN, 'utf8'));
  const ext = JSON.parse(fs.readFileSync(EXT, 'utf8'));
  return { table, ext, byLabel: new Map(table.entries.map((e) => [e.label, e])) };
}

/** 还需要对齐的证名：构件级、非并病、非因果链（与 build 的「弱构件级」同一批） */
function weakLabels(ext) {
  return ext.entries
    .filter((e) => e.scope === 'component' && !e.concurrent && e.relationChain !== 'cause-effect')
    .map((e) => e.label)
    .sort();
}

/** 国家表逐串计数（mirror 不在就返回 null，不 fail —— 换机器跑测试时允许缺） */
function tableText(entryBasis) {
  const p = (entryBasis && entryBasis.extractedText) || '';
  if (!p || !fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8');
}

function hits(text, s) {
  return text.split(s).length - 1;
}

function check() {
  const { table, ext, byLabel } = load();
  const problems = [];
  const notes = [];

  if (!Array.isArray(table.entries) || !table.entries.length) problems.push('entries 为空');
  const labels = table.entries.map((e) => e.label);
  if (new Set(labels).size !== labels.length) problems.push('label 有重复');

  const weak = weakLabels(ext);
  const missing = weak.filter((l) => !byLabel.has(l));
  const extra = labels.filter((l) => !weak.includes(l));
  if (missing.length) problems.push(`弱构件级里这 ${missing.length} 条还没对齐：${missing.join(' · ')}`);
  if (extra.length) problems.push(`这 ${extra.length} 条不是弱构件级（不该出现在这张表里）：${extra.join(' · ')}`);

  const extByLabel = new Map(ext.entries.map((e) => [e.label, e]));
  const text = tableText(table.$basis);

  for (const e of table.entries) {
    const parts = L.componentsOf(e.label);
    if (parts.length < 2) problems.push(`${e.label} 不是合称（componentsOf 只切出 ${parts.length} 个构件）`);
    if (e.primary !== parts[0]) problems.push(`${e.label} 的主构件应为首构件「${parts[0]}」，写的是「${e.primary}」`);
    const droppedParts = parts.slice(1);
    const gotDropped = (e.dropped || []).map((d) => d.part);
    if (JSON.stringify(gotDropped) !== JSON.stringify(droppedParts)) {
      problems.push(`${e.label} 的 dropped 应为 ${JSON.stringify(droppedParts)}，写的是 ${JSON.stringify(gotDropped)}`);
    }
    if (e.wholeStandardName !== null) problems.push(`${e.label} 的 wholeStandardName 必须为 null（合称在标准表里没有正名）`);
    if (!e.standardName || !e.standardName.endsWith('证')) problems.push(`${e.label} 的 standardName 必须以「证」结尾`);
    if (!e.standardNameNote) problems.push(`${e.label} 缺 standardNameNote（取正名的依据）`);

    for (const c of [e.standardCode, ...(e.dropped || []).map((d) => d.standardCode)].filter(Boolean)) {
      if (!CODE_RE.test(c)) problems.push(`${e.label} 的代码「${c}」不像国标/医保码`);
      if (WHO_RE.test(c)) problems.push(`${e.label} 的代码「${c}」是 WHO-TCM 形态（x.y.z），不许混写`);
    }

    for (const d of e.dropped || []) {
      if (!['standard', 'nonstandard'].includes(d.status)) problems.push(`${e.label} 的构件「${d.part}」status 非法：${d.status}`);
      if (d.status === 'nonstandard' && d.standardName) problems.push(`${e.label} 的「${d.part}」标 nonstandard 却给了 standardName`);
      if (d.status === 'standard' && !d.standardName) problems.push(`${e.label} 的「${d.part}」标 standard 却没给 standardName`);
      if (text) {
        const bare = d.part.replace(/证$/, '');
        const h = hits(text, bare);
        if (d.status === 'nonstandard' && h !== 0) problems.push(`${e.label} 的「${d.part}」标 nonstandard，但国家表里命中 ${h} 次`);
        if (d.status === 'standard' && h === 0) problems.push(`${e.label} 的「${d.part}」标 standard，但国家表里 0 命中`);
      }
    }

    if (text && e.standardName && hits(text, e.standardName) === 0) {
      problems.push(`${e.label} 的 standardName「${e.standardName}」在国家表里 0 命中`);
    }

    const src = extByLabel.get(e.label);
    if (src && src.scope !== 'component') problems.push(`${e.label} 在 external.json 里不是 component（对齐不该改变证据分级）`);
  }

  if (!text) notes.push('未找到国家表抽取文本，跳过「逐串命中」复核（只跑结构门）');

  console.log('═══ 术语对齐（取主构件）═══\n');
  console.log(`  对齐条目 ${table.entries.length} · 弱构件级 ${weak.length} · 国家表复核 ${text ? '已跑' : '跳过'}`);
  if (notes.length) for (const n of notes) console.log(`  ! ${n}`);
  if (problems.length) {
    console.log(`\n  ✗ ${problems.length} 个问题：`);
    for (const p of problems) console.log(`    - ${p}`);
    return 1;
  }
  console.log('\n  ✓ 全部通过');
  return 0;
}

function print() {
  const { table } = load();
  for (const e of table.entries) {
    const code = e.standardCode ? ` ${e.standardCode}` : '';
    console.log(`${e.label}`);
    console.log(`  → 主构件正名：${e.standardName}${code}（主构件「${e.primary}」）`);
    for (const d of e.dropped) {
      const mark = d.status === 'standard' ? '标准名' : '文献无证名';
      console.log(`  · 丢弃「${d.part}」：${mark}${d.standardName ? `（${d.standardName}${d.standardCode ? ` ${d.standardCode}` : ''}）` : ''}`);
    }
  }
  console.log(`\n合计 ${table.entries.length} 条；合称本身均无标准名（wholeStandardName = null）。`);
}

function json() {
  const { byLabel } = load();
  console.log(JSON.stringify(Object.fromEntries(byLabel), null, 2));
}

function main() {
  const arg = process.argv[2] || '';
  if (arg === '--check') process.exit(check());
  else if (arg === '--json') json();
  else print();
}

if (require.main === module) main();

module.exports = { load, weakLabels, CODE_RE, WHO_RE };
