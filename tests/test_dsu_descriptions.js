#!/usr/bin/env node
/**
 * tests/test_dsu_descriptions.js — 证候描述（从证据组装）
 *
 * 守三件事：
 *  1. 构词解析正确（证名是构词的，拆得出才拆得出，拆不出要留残余而不是硬凑）
 *  2. **证据只取正文** —— 这条是本仓库第 3 次栽的同一个坑，必须有断言钉住
 *  3. 覆盖数字如实（含"教材证据只有 3/96"这个难看但真实的数）
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');

const ROOT = path.resolve(__dirname, '..');
const D = require(path.join(ROOT, 'scripts', 'build_dsu_descriptions.js'));

let passed = 0;
const failures = [];
function test(name, fn) {
  try { passed += 1; fn(); console.log(`  ✓ ${name}`); }
  catch (e) { failures.push({ name, err: e }); console.log(`  ✗ ${name}\n      ${e.message}`); }
}

console.log('═══ 证候描述 ═══\n');

const JSON_PATH = path.join(ROOT, 'standards/semtensor/descriptions/dsu-descriptions.json');
const MD_PATH = path.join(ROOT, 'standards/semtensor/descriptions/descriptions.md');
assert.ok(fs.existsSync(JSON_PATH), '先跑 node scripts/build_dsu_descriptions.js');
const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
const md = fs.readFileSync(MD_PATH, 'utf8');

test('构词解析：风寒束表证 → 病性含「风寒」、病位含「表」', () => {
  const d = D.decompose('风寒束表证');
  assert.ok(d.nature.includes('风寒'), `病性实为 ${JSON.stringify(d.nature)}`);
  assert.ok(d.locus.includes('表'), `病位实为 ${JSON.stringify(d.locus)}`);
});

test('构词解析：肝胆湿热证 → 病性「湿热」、病位「肝」「胆」', () => {
  const d = D.decompose('肝胆湿热证');
  assert.ok(d.nature.includes('湿热'), `病性实为 ${JSON.stringify(d.nature)}`);
  assert.ok(d.locus.includes('肝') && d.locus.includes('胆'), `病位实为 ${JSON.stringify(d.locus)}`);
});

test('构词解析：最长匹配不重复计数（寒湿不被拆成 寒+湿）', () => {
  const d = D.decompose('寒湿困脾证');
  assert.ok(d.nature.includes('寒湿'), `病性实为 ${JSON.stringify(d.nature)}`);
  assert.ok(!d.nature.includes('寒') || d.nature.filter((x) => x === '寒').length === 0,
    `「寒湿」被重复拆成了 ${JSON.stringify(d.nature)}`);
});

test('**守门：证据语料只能来自正文（.md），不许含数据集/索引/报告**', () => {
  const list = data.stats.corpusFileList || [];
  assert.ok(list.length > 10, `语料过短：${list.length}`);
  const bad = list.filter((f) => {
    const s = f.replace(/\\/g, '/');
    return !/\.md$/.test(s) || /semtensor\/datasets\//.test(s) || /semtensor\/descriptions\//.test(s);
  });
  assert.deepStrictEqual(bad, [],
    `语料里混进了非正文（这正是第 3 次栽的坑 —— 教材证据曾 96/96 全部来自自己的 JSON）：\n${bad.join('\n')}`);
});

test('覆盖数字如实：教材证据 3/96（不是 96/96）', () => {
  // 这个数很难看，但它必须被钉住：任何一次"语料放宽"都会把它推回虚高。
  assert.strictEqual(data.stats.labels, 96);
  assert.strictEqual(data.stats.dsuRecords, 103);
  assert.strictEqual(data.stats.withTextbook, 3,
    `教材证据 ${data.stats.withTextbook}/96 —— 若这个数突然变大，先查语料是不是又放宽了`);
  assert.ok(data.stats.withExternal >= 1, '外部证据一条都没有？那 external.json 没被读进来');
  assert.strictEqual(data.stats.fullyMissing > 0, true, '六项全缺为 0 —— 与实测不符，需重审');
});

test('每条记录都带出处或显式缺失，不留空话', () => {
  for (const r of data.records) {
    assert.ok(Array.isArray(r.missing), `${r.label} 没有 missing 字段`);
    const has = r.decomposed.nature.length || r.decomposed.locus.length || r.mechanisms.length ||
      r.disease || r.icd || r.textbookEvidence.length || r.externalEvidence.length;
    if (!has) assert.ok(r.missing.length >= 6, `${r.label} 什么都没给，却没标缺失`);
    for (const c of r.textbookEvidence) assert.ok(c.file && c.snippet, `${r.label} 的教材证据缺出处`);
    for (const e of r.externalEvidence) assert.ok(e.url && e.snippet, `${r.label} 的外部证据缺 URL`);
  }
});

test('外部证据带 URL 与出处类型（可核查，不是转述）', () => {
  const ext = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/semtensor/descriptions/external.json'), 'utf8'));
  assert.ok(ext.entries.length >= 5, `外部证据只有 ${ext.entries.length} 条`);
  assert.ok(ext.channel && /web_search/.test(ext.channel), '未记录检索途径');
  assert.ok(/不可达/.test(ext.$note.join(' ')) || /403/.test(ext.$note.join(' ')), '未记录维基不可达这一事实');
  for (const e of ext.entries) for (const s of e.sources) {
    assert.match(s.url, /^https?:\/\//, `${e.label} 的来源缺 URL`);
    assert.ok(s.type, `${e.label} 的来源缺类型标注`);
  }
});

test('人读版（descriptions.md）写明了那条更正', () => {
  assert.match(md, /教材证据只有 3\/96/, '人读版没写更正');
  assert.match(md, /自我印证/, '人读版没解释为什么 96/96 是假的');
});

console.log(`\n  ${passed} 通过 · ${failures.length} 失败`);
if (failures.length) {
  console.log('\n失败明细:');
  failures.forEach((f) => console.log(`  ✗ ${f.name}\n    ${f.err.stack.split('\n').slice(0, 3).join('\n    ')}`));
  process.exit(1);
}
console.log('\n✅ 证候描述通过');
