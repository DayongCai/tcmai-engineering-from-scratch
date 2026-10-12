#!/usr/bin/env node
/**
 * tests/test_links.js — 内部链接检查（把 scripts/check_links.js 接成常驻门）
 *
 * 为什么要有这一层：链接断了**不会报错**，只是点不动。文档里写着「见 xxx.md」，
 * 文件改名后那句话就变成假的，而没有任何东西会告诉你。
 *
 * 本节还守住检查器自己的判据 —— 检查器的错法有两种，都会让它变成摆设：
 *   ① 判得太宽：把「指向尚未开工学科」的前瞻引用当断链，报出上百条，
 *      人就不看了，等于没有门；
 *   ② 判得太松：把**已建学科内部**的路径写错也归进「尚未开工」吞掉，
 *      于是真 bug 永远浮不出来（本检查器第一版就是这样）。
 * 以下两条各测一边。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert');

const ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'check_links.js');

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push({ name, err: e }); console.log(`  ✗ ${name}\n      ${e.message}`); }
}

const run = (args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, encoding: 'utf8' });

console.log('═══ 内部链接检查 ═══\n');

test('检查器能跑，且以 --strict 判定（退出码 0 = 无断链）', () => {
  const r = run(['--strict']);
  assert.strictEqual(r.status, 0, `退出码 ${r.status}\n${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /内部链接检查/);
});

test('当前仓库零断链', () => {
  const r = run(['--json']);
  const j = JSON.parse(r.stdout);
  assert.strictEqual(j.broken, 0, `断链 ${j.broken} 处:\n${j.problems.filter((p) => p.kind !== 'unbuilt').map((p) => `  ${p.file} L${p.line} ${p.target}`).join('\n')}`);
  assert.ok(j.scanned > 100, `只扫到 ${j.scanned} 个文件，疑似遍历坏了`);
});

test('判据不过宽：不得把整片大纲当成断链（历史上曾报 124 条假阳性）', () => {
  const r = run(['--json']);
  const j = JSON.parse(r.stdout);
  assert.strictEqual(j.broken, 0);
  // 「未开工」必须是可以为 0 的独立分类，而不是把所有缺文件都塞进 broken
  assert.ok(typeof j.declaredUnbuilt === 'number');
});

test('判据不过松：已建学科内部的缺文件必须算断链（不是「未开工」）', () => {
  // 造一个临时断链在**已建**学科内部，要求检查器报出来
  const victim = path.join(ROOT, 'departments', '01-zhongyi', '01-zhongyi-jichu-lilun', 'README.md');
  const backup = fs.readFileSync(victim, 'utf8');
  try {
    fs.writeFileSync(victim, `${backup}\n\n[故意断链](../definitely-not-here.md)\n`, 'utf8');
    const r = run(['--json']);
    const j = JSON.parse(r.stdout);
    const hit = j.problems.find((p) => p.target.includes('definitely-not-here'));
    assert.ok(hit, '检查器没报出已建学科内部的断链');
    assert.notStrictEqual(hit.kind, 'unbuilt', '把已建学科内部的缺文件误判为「未开工」');
  } finally {
    fs.writeFileSync(victim, backup, 'utf8');
  }
  // 还原后必须回到干净
  const after = JSON.parse(run(['--json']).stdout);
  assert.strictEqual(after.broken, 0, '还原后仍有断链，说明检查器或还原有问题');
});

test('模板与源材料全本被跳过（它们不是本仓库撰写/不是文档）', () => {
  const r = run(['--json']);
  const j = JSON.parse(r.stdout);
  const touched = j.problems.filter((p) => /^(templates|standards\/materials|site\/snapshot)\//.test(p.file));
  assert.strictEqual(touched.length, 0, `不该检查这些文件: ${touched.map((p) => p.file).join(', ')}`);
});

console.log(`\n  ${passed} 通过 · ${failures.length} 失败`);
if (failures.length) {
  console.log('\n失败明细:');
  failures.forEach((f) => console.log(`  ✗ ${f.name}\n    ${f.err.stack.split('\n').slice(0, 3).join('\n    ')}`));
  process.exit(1);
}
console.log('\n✅ 内部链接检查通过');
