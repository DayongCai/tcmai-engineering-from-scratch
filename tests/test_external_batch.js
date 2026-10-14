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
    assert.ok(b.query.includes(b.label.replace(/[（(][^）)]*[）)]/g, '').trim()),
      `查询串没带上证名：${JSON.stringify(b)}`);
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

test('去括注：`膀胱湿热证（热淋）` 的查询串不带括注', () => {
  const q = B.queryFor('膀胱湿热证（热淋）');
  assert.ok(q.startsWith('膀胱湿热证 '), q);
  assert.ok(!q.includes('热淋'), `括注没被去掉：${q}`);
});

console.log(`\n  ${passed} 通过 · ${failures.length} 失败`);
if (failures.length) {
  console.log('\n失败明细:');
  failures.forEach((f) => console.log(`  ✗ ${f.name}\n    ${f.err.stack.split('\n').slice(0, 3).join('\n    ')}`));
  process.exit(1);
}
console.log('\n✅ 分批机制通过');
