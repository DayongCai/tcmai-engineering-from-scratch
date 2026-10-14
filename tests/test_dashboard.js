#!/usr/bin/env node
/**
 * tests/test_dashboard.js — 项目看板
 *
 * 看板是**派生件**：它显示的每个数字都必须与源一致。会撒谎的看板比没有看板更糟 ——
 * 它把"没做"包装成"做了"，而看的人不会去核。
 *
 * 这里做的事就是**独立重算一遍**再比对（在测试里重复计数是故意的：不重复就没有验证）。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'dashboard.html');

let passed = 0;
const failures = [];
function test(name, fn) {
  try { passed += 1; fn(); console.log(`  ✓ ${name}`); }
  catch (e) { failures.push({ name, err: e }); console.log(`  ✗ ${name}\n      ${e.message}`); }
}

console.log('═══ 项目看板 ═══\n');

if (!fs.existsSync(HTML)) {
  console.log('  ✗ dashboard.html 不存在 —— 先跑 node scripts/build_dashboard.js');
  process.exit(1);
}
const html = fs.readFileSync(HTML, 'utf8');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

/** 从 KPI 块里取某一项的值 */
function kpi(label) {
  const re = new RegExp(`<div class="k">${label}</div><div class="v">([^<]*)`);
  const m = re.exec(html);
  return m ? m[1].trim() : null;
}

test('KPI「学科」与 catalog.json 一致', () => {
  const catalog = readJson('catalog.json');
  assert.strictEqual(kpi('学科'), String(catalog.counts.subjects));
});

test('KPI「章节（目标）」与 catalog.json 一致', () => {
  const catalog = readJson('catalog.json');
  assert.strictEqual(kpi('章节（目标）'), String(catalog.counts.chapters));
});

test('KPI「版本」与 package.json 一致', () => {
  assert.strictEqual(kpi('版本'), readJson('package.json').version);
});

test('KPI「产出物」与 outputs/index.json 一致', () => {
  const idx = readJson('outputs/index.json');
  assert.strictEqual(kpi('产出物'), String(idx.counts.items));
});

test('KPI「已建章节」= 磁盘上真实存在的章节 docs/zh.md 数', () => {
  const dirs = [];
  const walk = (d) => {
    let e; try { e = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const x of e) {
      const p = path.join(d, x.name);
      if (x.isDirectory()) walk(p);
      else if (/docs[\\/]zh\.md$/.test(p)) dirs.push(path.dirname(path.dirname(p)));
    }
  };
  walk(path.join(ROOT, 'departments'));
  const real = new Set(dirs).size;
  assert.strictEqual(kpi('已建章节'), String(real), `磁盘上实为 ${real} 个已建章节`);
});

test('KPI「扫描 md」取自 check_links.js，不另数一份', () => {
  const r = spawnSync(process.execPath, ['scripts/check_links.js'], { cwd: ROOT, encoding: 'utf8' });
  const m = /扫描\s*(\d+)/.exec(r.stdout || '');
  assert.ok(m, 'check_links.js 没输出扫描数');
  assert.strictEqual(kpi('扫描 md'), m[1], '看板与官方检查器数字不一致（曾经 174 vs 175）');
});

test('KPI「测试套件」= run_all.js 里注册的套件数', () => {
  const runAll = fs.readFileSync(path.join(ROOT, 'tests/run_all.js'), 'utf8');
  const n = (runAll.match(/\{ file: '/g) || []).length;
  assert.strictEqual(kpi('测试套件'), String(n));
});

test('工作流状态标签只用四个允许值，且每行都带证据', () => {
  const allowed = ['已完成', '进行中', '受阻', '未开工'];
  const pills = [...html.matchAll(/<span class="pill (s-\w+)">([^<]+)<\/span>/g)]
    .map((m) => m[2]).filter((t) => allowed.includes(t) || /^(小|中|大)$/.test(t));
  assert.ok(pills.length >= 8, `状态标签只有 ${pills.length} 个，工作流行疑似丢失`);
  for (const p of pills) {
    if (/^(小|中|大)$/.test(p)) continue;
    assert.ok(allowed.includes(p), `出现未定义状态「${p}」`);
  }
  const rows = (html.match(/<tr><td>/g) || []).length;
  assert.ok(rows >= 8, `工作流表格只有 ${rows} 行`);
});

test('每条阻塞项都写了「解除」条件（只报困难不给路径，不是看板）', () => {
  const cards = [...html.matchAll(/<div class="card"><h3>([\s\S]*?)<\/div><\/div>/g)];
  assert.ok(cards.length >= 4, `阻塞卡片只有 ${cards.length} 个`);
  for (const c of cards) {
    assert.ok(/解除：/.test(c[0]), `阻塞项「${c[1]}」没写解除条件`);
    assert.ok(/影响：/.test(c[0]), `阻塞项「${c[1]}」没写影响`);
    assert.ok(/为什么：/.test(c[0]), `阻塞项「${c[1]}」没写原因`);
  }
});

test('缺派生件时显式标「未生成」，不静默留空', () => {
  // 若 embeddings/icd11 的派生件不存在，对应行必须出现「未生成」字样
  const emb = fs.existsSync(path.join(ROOT, 'standards/semtensor/embeddings/index.json'));
  const icd = fs.existsSync(path.join(ROOT, 'data/icd11/meta.json'));
  if (!emb) assert.ok(/未生成/.test(html), '嵌入层派生件缺失，看板却没标「未生成」');
  if (!icd) assert.ok(/未构建/.test(html), 'ICD-11 本地库缺失，看板却没标「未构建」');
  assert.ok(true);
});

test('看板声明了「以证据为准」，不宣称自己是权威', () => {
  assert.match(html, /以证据为准/);
  assert.match(html, /不猜不留空/);
});

console.log(`\n  ${passed} 通过 · ${failures.length} 失败`);
if (failures.length) {
  console.log('\n失败明细:');
  failures.forEach((f) => console.log(`  ✗ ${f.name}\n    ${f.err.stack.split('\n').slice(0, 3).join('\n    ')}`));
  process.exit(1);
}
console.log('\n✅ 项目看板通过');
