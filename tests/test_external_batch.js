#!/usr/bin/env node
/**
 * tests/test_external_batch.js — 证候外部证据的**分批**取用机制
 *
 * 这个机制的价值全在两条约束上，所以只测这两条：
 *   1. **空结果不入库** —— 检索失败就什么都不写。写一条 `sources: []` 会让"没取到"
 *      看起来像"取到了但内容为空"。
 *   2. **幂等** —— 同一批重复导入不能产生重复条目（否则"分批"会变成"越跑越脏"）。
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert');

const ROOT = path.resolve(__dirname, '..');
const B = require(path.join(ROOT, 'scripts', 'external_batch.js'));

let passed = 0;
const failures = [];
function test(name, fn) {
  try { passed += 1; fn(); console.log(`  ✓ ${name}`); }
  catch (e) { failures.push({ name, err: e }); console.log(`  ✗ ${name}\n      ${e.message}`); }
}

console.log('═══ 外部证据分批机制 ═══\n');

test('队列是确定性的：同一状态两次跑出同一批', () => {
  const r1 = spawnSync(process.execPath, ['scripts/external_batch.js', '--next', '-n', '5'], { cwd: ROOT, encoding: 'utf8' });
  const r2 = spawnSync(process.execPath, ['scripts/external_batch.js', '--next', '-n', '5'], { cwd: ROOT, encoding: 'utf8' });
  assert.strictEqual(r1.status, 0, r1.stderr);
  assert.strictEqual(r1.stdout, r2.stdout, '同一状态两次给出的批次不同 —— 队列不确定');
  const batch = JSON.parse(r1.stdout);
  assert.ok(batch.length > 0 && batch.length <= 5, `批次大小 ${batch.length}`);
  for (const b of batch) {
    assert.ok(b.label && b.query, '批次项缺 label 或 query');
    // 证名按 ICD-11 标准命名，`、` 是名称的一部分 —— 检索串把顿号换成空格，
    // 因此断言改为「每个构件都在串里」，而不是「整串逐字在串里」。
    const base = b.label.replace(/[（(][^）)]*[）)]/g, '').trim();
    for (const part of base.split('、').map((s) => s.trim()).filter(Boolean)) {
      assert.ok(b.query.includes(part), `查询串漏了构件「${part}」：${JSON.stringify(b)}`);
    }
    assert.ok(!b.query.includes('、'), `检索串里残留顿号：${b.query}`);
    assert.ok(!/[（(]/.test(b.query.replace('中医病证名', '')), `查询串里残留括注：${b.query}`);
  }
});

test('幂等：同一批导入两次，第二次全部跳过', () => {
  // 用一份**临时副本**跑，别动真文件
  const real = path.join(ROOT, 'standards/semtensor/descriptions/external.json');
  const backup = fs.readFileSync(real, 'utf8');
  const tmp = path.join(os.tmpdir(), `xb-${Date.now()}.json`);
  const batch = [
    { label: '__测试证候甲__', sources: [{ type: '测试', title: 't', url: 'https://example.invalid/a', snippet: 's' }] },
    { label: '__测试证候乙__', failed: true, sources: [] },   // 失败项
  ];
  fs.writeFileSync(tmp, JSON.stringify(batch), 'utf8');
  try {
    const r1 = spawnSync(process.execPath, ['scripts/external_batch.js', '--import', tmp], { cwd: ROOT, encoding: 'utf8' });
    assert.strictEqual(r1.status, 0, r1.stderr);
    assert.match(r1.stdout, /新增 1 .* 空结果丢弃 1/, `首次导入结果异常：${r1.stdout}`);
    const after1 = JSON.parse(fs.readFileSync(real, 'utf8'));
    const count = (j, l) => j.entries.filter((e) => e.label === l).length;
    assert.strictEqual(count(after1, '__测试证候甲__'), 1);
    assert.strictEqual(count(after1, '__测试证候乙__'), 0, '**失败项被写进库了** —— 这正是要防的');

    const r2 = spawnSync(process.execPath, ['scripts/external_batch.js', '--import', tmp], { cwd: ROOT, encoding: 'utf8' });
    assert.match(r2.stdout, /新增 0 .* 已有跳过 1/, `复跑不幂等：${r2.stdout}`);
    const after2 = JSON.parse(fs.readFileSync(real, 'utf8'));
    assert.strictEqual(count(after2, '__测试证候甲__'), 1, '重复导入产生了重复条目');
  } finally {
    fs.writeFileSync(real, backup, 'utf8');   // 还原
    fs.rmSync(tmp, { force: true });
  }
});

test('还原成功：external.json 回到原样', () => {
  const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/semtensor/descriptions/external.json'), 'utf8'));
  assert.ok(!j.entries.some((e) => /^__测试/.test(e.label)), '测试条目残留了');
  assert.ok(j.entries.length >= 8, `条目数异常：${j.entries.length}`);
});

// **这条断言翻转了**。原来这里是「去括注：查询串不带括注」，即有意把
// 「膀胱湿热证（热淋）」削成「膀胱湿热证」。翻转的依据是第 3 批的实跑证据：
// 「气滞血瘀证(颈部)」被削掉「颈部」后，取回的是通用来源，**特指证据没取到**，
// 而该 label 一旦入库队列就不会再查 —— 损失无法自动发现。既然括注既有同义别名
// 也有部位/病种限定，一律并入才是安全的。翻断言就要说清为什么翻，不能悄悄改。
test('保留括注：`膀胱湿热证（热淋）` 的查询串带「热淋」，但仍不带括号符号', () => {
  const q = B.queryFor('膀胱湿热证（热淋）');
  assert.ok(q.startsWith('膀胱湿热证 '), q);
  assert.ok(q.includes('热淋'), `括注被削掉了（这是旧行为，已废弃）：${q}`);
  assert.ok(!/[（()）]/.test(q), `检索串里残留了括号：${q}`);
});

test('检索串保留括注限定词（第 3 批踩出来的：削掉「颈部」就只剩通用证据）', () => {
  const q1 = B.queryFor('气滞血瘀证(颈部)');
  assert.ok(q1.includes('颈部'), `部位限定被削掉了：${q1}`);
  const q2 = B.queryFor('寒哮证（冷哮）');
  assert.ok(q2.includes('冷哮'), `同义别名被削掉了：${q2}`);
  assert.ok(!/[（()）]/.test(q1) && !/[（()）]/.test(q2), '检索串里残留了括号符号');
  assert.ok(!B.queryFor('风寒束表证').includes('  '), '无括注时多出了空格');
});

test('证名是 ICD-11 标准名：`、` 属名称，检索串只换空格、不删词', () => {
  const q = B.queryFor('肺经风热、湿热瘀结证');
  assert.ok(q.includes('肺经风热'), `漏了前半：${q}`);
  assert.ok(q.includes('湿热瘀结证'), `漏了后半：${q}`);
  assert.ok(!q.includes('、'), `顿号没换成空格：${q}`);
  assert.deepStrictEqual(B.components('肺经风热、湿热瘀结证'), ['肺经风热', '湿热瘀结证']);
  // 顿号 + 括注同时出现：三者都要在串里
  const q2 = B.queryFor('胆郁痰扰、心神不宁证(惊悸/不寐)');
  assert.ok(q2.includes('胆郁痰扰') && q2.includes('心神不宁证') && q2.includes('惊悸/不寐'), q2);
});

test('证据分级：single / whole / component / partial 四种判定', () => {
  const S = require(path.join(ROOT, 'scripts', 'lib_evidence_scope.js'));
  const src = (t, s) => ({ title: t, snippet: s || '' });
  // 单构件：来源写「脾胃湿热」即可（「证」是类别后缀，不参与区分）
  assert.strictEqual(S.classify({ label: '脾胃湿热证', sources: [src('脾胃湿热')] }).scope, 'single');
  // 整串级：一条来源同时覆盖两个构件
  assert.strictEqual(S.classify({ label: '胸阳痹阻、痰瘀互结证', sources: [src('胸阳痹阻与痰瘀互结')] }).scope, 'whole');
  // 构件级：两条来源各覆盖一个构件
  assert.strictEqual(S.classify({ label: '胸阳痹阻、痰瘀互结证', sources: [src('胸阳痹阻'), src('痰瘀互结证')] }).scope, 'component');
  // 不合格：缺构件
  const p = S.classify({ label: '胸阳痹阻、痰瘀互结证', sources: [src('胸阳痹阻')] });
  assert.strictEqual(p.scope, 'partial');
  assert.deepStrictEqual(p.missing, ['痰瘀互结证']);
  // 括注不参与构件判定
  assert.deepStrictEqual(S.componentsOf('气滞血瘀证(颈部)'), ['气滞血瘀证']);
});

test('繁体来源可判（肝陽上亢證 → 肝阳上亢证），且不改写原文', () => {
  const S = require(path.join(ROOT, 'scripts', 'lib_evidence_scope.js'));
  assert.ok(S.covers('肝陽上亢證 · 韓藥資源研究中心', '肝阳上亢证'));
  assert.ok(S.covers('濕熱下注所致之熱淋', '湿热下注证'));
  assert.strictEqual(S.toSimplified('肝陽上亢證'), '肝阳上亢证');
});

test('全库 scope 与口径一致（手改 external.json 后必须跑 --audit）', () => {
  const S = require(path.join(ROOT, 'scripts', 'lib_evidence_scope.js'));
  const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/semtensor/descriptions/external.json'), 'utf8'));
  const drift = j.entries
    .filter((e) => S.classify(e).scope !== e.scope)
    .map((e) => `${e.label}: 存 ${e.scope} / 算 ${S.classify(e).scope}`);
  assert.ok(!drift.length, `分级漂移，跑 node scripts/external_batch.js --audit：\n${drift.join('\n')}`);
});

test('splitLabel 把本体与括注分开，两种括号都认', () => {
  assert.deepStrictEqual(B.splitLabel('气滞血瘀证(颈部)'), { base: '气滞血瘀证', context: ['颈部'] });
  assert.deepStrictEqual(B.splitLabel('寒哮证（冷哮）'), { base: '寒哮证', context: ['冷哮'] });
  assert.deepStrictEqual(B.splitLabel('风寒束表证'), { base: '风寒束表证', context: [] });
  // 队列里真实存在的长证名（多证并列 + 病种括注）
  assert.deepStrictEqual(B.splitLabel('心肾不交、阴虚火旺证(不寐)'),
    { base: '心肾不交、阴虚火旺证', context: ['不寐'] });
});

console.log(`\n  ${passed} 通过 · ${failures.length} 失败`);
if (failures.length) {
  console.log('\n失败明细:');
  failures.forEach((f) => console.log(`  ✗ ${f.name}\n    ${f.err.stack.split('\n').slice(0, 3).join('\n    ')}`));
  process.exit(1);
}
console.log('\n✅ 分批机制通过');
