#!/usr/bin/env node
/**
 * tests/test_leijing_colors.js — 类经图翼方位色接入层
 *
 * 本节的重点不是「文件存在」，而是**判定本身的可靠性**：
 *   - 规范确实从源 xlsx 解析而来（指纹可复现）
 *   - 主矩阵 16×11、方位映射 11 类、三层球面 R=1.00/0.66/0.33 都在
 *   - 源内一致性核对逐条落库；其中「东的经度」自相矛盾必须被记为 contradiction，
 *     而不是被悄悄选一个值
 *   - 配色判定必须用**同规模随机调色板**对照（不是随机点），且结论为「不能解释」
 *   - 方法说明里写明为什么不能用随机点 —— 这是第一版犯错的地方
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'standards', 'leijing-tuyi');
const SRC = path.join(ROOT, 'standards', 'materials', 'leijing-tuyi', 'sources', '类经图翼_v1.0定稿.xlsx');

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push({ name, err: e }); console.log(`  ✗ ${name}\n      ${e.message}`); }
}

console.log('═══ 类经图翼方位色接入层 ═══\n');

const spec = JSON.parse(fs.readFileSync(path.join(DIR, '方位色彩分层.json'), 'utf8'));
const md = fs.readFileSync(path.join(DIR, '方位色彩分层.md'), 'utf8');

test('主矩阵：16 类语义范畴 × 11 类方位', () => {
  assert.strictEqual(spec.mainMatrix.categories.length, 16, `范畴 ${spec.mainMatrix.categories.length} 类`);
  assert.strictEqual(spec.mainMatrix.directions.length, 11, `方位 ${spec.mainMatrix.directions.length} 类`);
  assert.deepStrictEqual(spec.mainMatrix.directions, ['东', '南', '西', '北', '中', '四隅', '天球星野', '上下', '左右', '前后', '内外表里']);
  spec.mainMatrix.categories.forEach((c) => {
    const sum = spec.mainMatrix.directions.reduce((a, d) => a + (c.hits[d] || 0), 0);
    assert.ok(c.total > 0, `${c.category} 合计为 0`);
    assert.ok(Math.abs(sum - c.total) <= 1, `${c.category} 行内和 ${sum} ≠ 合计 ${c.total}`);
  });
});

test('方位映射：11 类各带球面轴 + 传统色；10 类有实色，四隅按设计取插值', () => {
  assert.strictEqual(spec.directionMap.length, 11);
  spec.directionMap.forEach((d) => {
    assert.ok(d.dir && d.axis && d.traditional, `${d.dir} 缺字段`);
  });
  // 实测：11 类里 10 类给了固定色值，只有「四隅」的源值写作「按两端插值」——
  // 这不是缺数据，是设计（四隅 = 相邻两正方向的间色）。
  const withHex = spec.directionMap.filter((d) => /#[0-9A-Fa-f]{6}/.test(d.color));
  const byInterp = spec.directionMap.filter((d) => !/#[0-9A-Fa-f]{6}/.test(d.color));
  assert.strictEqual(withHex.length, 10, `有实色的方位类 ${withHex.length} 个`);
  assert.deepStrictEqual(byInterp.map((d) => d.dir), ['四隅'], `无实色的应是四隅，实为 ${byInterp.map((d) => d.dir).join(',')}`);
  assert.match(byInterp[0].color, /插值/, '四隅应写明按两端插值');

  const byDir = Object.fromEntries(spec.directionMap.map((d) => [d.dir, d]));
  assert.strictEqual(byDir['东'].color, '#4C9F70');
  assert.strictEqual(byDir['南'].color, '#D9534F');
  assert.strictEqual(byDir['西'].color, '#C9CDD4');
  assert.strictEqual(byDir['北'].color, '#2B3A67');
  assert.strictEqual(byDir['中'].color, '#E0A800');
  assert.strictEqual(byDir['天球星野'].color, '#7B5EA7');
  // 传统色（五方）必须写出来
  ['青（木）', '赤（火）', '白（金）', '黑（水）', '黄（土）'].forEach((t) => {
    assert.ok(spec.directionMap.some((d) => d.traditional === t), `缺传统色 ${t}`);
  });
});

test('三层球面：外层 R=1.00 · 中层 R=0.66 · 内层 R=0.33', () => {
  assert.strictEqual(spec.shells.length, 3);
  const byShell = Object.fromEntries(spec.shells.map((s) => [s.shell.split('·')[0], s.radius]));
  assert.strictEqual(byShell['外层'], 'R = 1.00');
  assert.strictEqual(byShell['中层'], 'R = 0.66');
  assert.strictEqual(byShell['内层'], 'R = 0.33');
});

test('源内一致性核对四条全部落库', () => {
  assert.strictEqual(spec.consistencyChecks.length, 4);
  assert.deepStrictEqual(spec.consistencyChecks.map((c) => c.id), ['C1', 'C2', 'C3', 'C4']);
  spec.consistencyChecks.forEach((c) => assert.ok(c.what && c.result, `${c.id} 缺说明`));
});

test('C2/C3 通过：合计行与映射表同值、去重行数不超过范畴和', () => {
  const byId = Object.fromEntries(spec.consistencyChecks.map((c) => [c.id, c]));
  assert.strictEqual(byId.C2.verdict, 'pass', byId.C2.result);
  assert.strictEqual(byId.C3.verdict, 'pass', byId.C3.result);
  byId.C3.details.forEach((x) => {
    assert.ok(x.distinct <= x.sumOfCategories, `${x.dir}: 去重 ${x.distinct} > 范畴和 ${x.sumOfCategories}`);
  });
});

test('C4 记录源内自相矛盾：东的经度 §二=90° vs §三=0°（不擅自选一个）', () => {
  const c4 = spec.consistencyChecks.find((c) => c.id === 'C4');
  assert.strictEqual(c4.verdict, 'contradiction', `C4 判定为 ${c4.verdict}，预期 contradiction`);
  assert.match(c4.result, /90/);
  assert.match(c4.result, /0°/);
  // 两处原值都要保留在规范里（不抹平）
  const east = spec.directionMap.find((d) => d.dir === '东');
  assert.match(east.axis, /经度\s*90°/);
  assert.match(spec.shells.find((s) => s.shell.includes('中层')).params, /东\s*0/);
  // 文档要写明「不擅自选一个」
  assert.match(md, /不擅自选一个/);
});

test('配色判定：必须用同规模随机调色板对照，且结论为「不能解释」', () => {
  const v = spec.colorVerdict;
  assert.strictEqual(v.dsuCount, 116, `DSU 色 ${v.dsuCount} 个`);
  // 对照是随机调色板，不是随机点
  assert.ok(v.randomPalettesTotal >= 1000, `随机调色板只跑了 ${v.randomPalettesTotal} 个`);
  assert.ok(typeof v.randomPaletteMeanDist === 'number' && v.randomPaletteMeanDist > 0);
  assert.ok(typeof v.naiveRandomPointMeanDist === 'number', '应留档错误对照的数值');
  // 结论：不显著
  assert.strictEqual(v.exactPaletteHits, 0, `精确命中 ${v.exactPaletteHits} 个，与结论不符`);
  assert.ok(v.realBetterThanRandomPalettePct < 95,
    `优于 ${v.realBetterThanRandomPalettePct}% 随机调色板，这不是「不显著」了`);
  assert.match(v.conclusion, /不能解释/, '结论应为「不能解释」');
});

test('方法说明写明「不能用随机点当基线」（第一版错在这里）', () => {
  const v = spec.colorVerdict;
  assert.match(v.methodNote, /随机调色板/);
  assert.match(v.methodNote, /随机「点」|随机点/);
  // 文档里要留档这个教训
  assert.match(md, /假信号/);
  assert.match(md, /对照要选对/);
});

test('出处可复现：sha256 等于入库源文件当前指纹', () => {
  const now = crypto.createHash('sha256').update(fs.readFileSync(SRC)).digest('hex');
  assert.strictEqual(now, spec.source.sha256, '源文件已变，需重跑 link_leijing_colors.js');
  assert.match(spec.source.sheet, /语义方位/);
});

test('规范与语义张量「颜色公理」被明确区分为两套独立规定', () => {
  assert.match(spec.note, /两套独立规定/);
  assert.match(spec.note, /不能复现/);
  // 不能含糊成「已经解开」
  assert.doesNotMatch(spec.note, /解开(了)?§14\.1|已解/);
});

test('人可读规范含五节，且明确写了「解不开 §14.1」', () => {
  ['## 一、方位', '## 二、三层球面', '## 三、主矩阵', '## 四、源内一致性核对', '## 五、配色判定'].forEach((h) => {
    assert.ok(md.includes(h), `缺小节 ${h}`);
  });
  assert.match(md, /解不开/);
  assert.ok(!md.includes('\r'), '含 CRLF');
});

console.log(`\n  ${passed} 通过 · ${failures.length} 失败`);
if (failures.length) {
  console.log('\n失败明细:');
  failures.forEach((f) => console.log(`  ✗ ${f.name}\n    ${f.err.stack.split('\n').slice(0, 3).join('\n    ')}`));
  process.exit(1);
}
console.log('\n✅ 类经图翼方位色接入层通过');
