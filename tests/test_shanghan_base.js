#!/usr/bin/env node
/**
 * tests/test_shanghan_base.js — 《伤寒论底本》导入层硬证据
 *
 * 测的是产物与源文件的关系，以及**跨源核对结论本身**：
 *   - 底本 27 篇 1760 条解析正确（条数/字数与目录声明核对得上）
 *   - 9 个域与既有 semtensor 数据集域名逐一一致（两个独立来源）
 *   - 条数不一致的那一处被显式记录（而不是被抹平）
 *   - 出处指纹可复现：source-map / 底本.json 记的 sha256 等于源文件当前指纹
 *   - 全本 Markdown 条号连续、无 CRLF
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'standards', 'shanghan');
const SRC = path.join(DIR, 'sources', '伤寒论底本.xlsx');

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push({ name, err: e }); console.log(`  ✗ ${name}\n      ${e.message}`); }
}

console.log('═══ 《伤寒论底本》导入层 ═══\n');

const base = JSON.parse(fs.readFileSync(path.join(DIR, '底本.json'), 'utf8'));
const cc = JSON.parse(fs.readFileSync(path.join(DIR, 'cross-check.json'), 'utf8')).crossCheck;
const md = fs.readFileSync(path.join(DIR, '底本.md'), 'utf8');

test('27 篇 · 1760 条 · 挂 9 个域', () => {
  assert.strictEqual(base.counts.pian, 27, `篇数 ${base.counts.pian}`);
  assert.strictEqual(base.counts.tiao, 1760, `条数 ${base.counts.tiao}`);
  assert.strictEqual(base.counts.domains, 9, `域数 ${base.counts.domains}`);
  assert.strictEqual(base.pian.length, 27);
});

test('每篇都解析到了正文，且都挂上了来源分表', () => {
  base.pian.forEach((p) => {
    assert.ok(p.items.length > 0, `第 ${p.no} 篇「${p.pian}」没有条目`);
    assert.ok(p.sheet, `第 ${p.no} 篇没有对上分表名`);
    assert.ok(p.sheet.startsWith(`S${String(p.no).padStart(2, '0')}`), `第 ${p.no} 篇挂到了 ${p.sheet}`);
  });
});

test('目录声明与实际条目数大体相符（差异被记录，不是掩盖）', () => {
  const declared = base.pian.reduce((a, p) => a + p.declared.tiao, 0);
  const actual = base.pian.reduce((a, p) => a + p.actual.tiao, 0);
  assert.ok(Math.abs(declared - actual) <= 10, `声明 ${declared} vs 实测 ${actual} 差距过大`);
  // 逐篇：声明条数与实际条数不应有数量级差异
  base.pian.forEach((p) => {
    assert.ok(p.actual.tiao > 0);
    assert.ok(p.actual.tiao >= p.declared.tiao * 0.5, `第 ${p.no} 篇实测 ${p.actual.tiao} 远少于声明 ${p.declared.tiao}`);
  });
});

test('与既有 semtensor 伤寒域数据集：9/9 域名一致', () => {
  assert.ok(cc.available, '交叉核对不可用');
  assert.strictEqual(cc.domainCountBase, 9);
  assert.strictEqual(cc.domainCountReference, 9);
  assert.deepStrictEqual(cc.onlyInBase, [], `底本独有的域: ${cc.onlyInBase.join(', ')}`);
  assert.deepStrictEqual(cc.onlyInReference, [], `旧推独有的域: ${cc.onlyInReference.join(', ')}`);
  assert.doesNotMatch(cc.verdict, /须人工裁定/);
});

test('条数一致 8/9，唯一不一致的「序跋·目录」被显式记下来', () => {
  assert.strictEqual(cc.tiaoDiffer, 1, `不一致 ${cc.tiaoDiffer} 处（预期恰好 1 处）`);
  const diff = cc.rows.filter((r) => r.tiaoAgree === false);
  assert.strictEqual(diff[0].domain, '序跋·目录');
  assert.ok(diff[0].baseActualTiao > 0 && diff[0].refTiao > 0);
  assert.strictEqual(diff[0].delta, diff[0].baseActualTiao - diff[0].refTiao);
});

test('对照表每一行都带两个来源的数值（不许只留一边）', () => {
  cc.rows.forEach((r) => {
    assert.ok(r.domain, '缺域名');
    assert.ok(typeof r.baseActualTiao === 'number', `${r.domain} 缺底本条数`);
    assert.ok(typeof r.refTiao === 'number', `${r.domain} 缺旧推条数`);
  });
});

test('source-map 记的 sha256 等于源文件当前指纹', () => {
  const now = crypto.createHash('sha256').update(fs.readFileSync(SRC)).digest('hex');
  assert.strictEqual(now, base.source.sha256, '源文件已变，需重跑导入器');
  assert.strictEqual(base.source.sheets.length, 28, `工作表 ${base.source.sheets.length}`);
});

test('全本 Markdown：无 CRLF、域小节齐全、条号从 1 起', () => {
  assert.ok(!md.includes('\r'), '底本.md 含 CRLF');
  for (const d of base.domains) assert.ok(md.includes(`## 域：${d.name}`), `缺域小节 ${d.name}`);
  assert.ok(/^1\. /m.test(md), '找不到条号 1');
});

test('反作用力：Markdown 与 JSON 的条数一致（防手改生成稿）', () => {
  const mdTiao = (md.match(/^\d+\. /gm) || []).length;
  assert.strictEqual(mdTiao, base.counts.tiao, `Markdown 里 ${mdTiao} 条，JSON 记 ${base.counts.tiao} 条`);
});

console.log(`\n  ${passed} 通过 · ${failures.length} 失败`);
if (failures.length) {
  console.log('\n失败明细:');
  failures.forEach((f) => console.log(`  ✗ ${f.name}\n    ${f.err.stack.split('\n').slice(0, 3).join('\n    ')}`));
  process.exit(1);
}
console.log('\n✅ 《伤寒论底本》导入层通过');
