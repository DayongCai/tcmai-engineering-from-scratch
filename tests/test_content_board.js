#!/usr/bin/env node
/**
 * tests/test_content_board.js — 专业内容看板的"不许说谎"测试
 *
 * 看板的每个数字都必须能从源重算出来。本测试不复述看板的值，而是**独立取源**
 * 再和看板比对；另钉四条容易虚报的边界：
 *   1. 单元数 ≠ 证候数（同一证候不同来源各建一条，必须同时报）
 *   2. 教材汉字取 totals.hanzi，不许拿非空白字符冒充
 *   3. 无结构化数据集的层记 n/a，不许写 0%（0% 会被读成"做了一点"）
 *   4. 盘上章节目录必须与 catalog.chaptersBuilt 对得上
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const B = require(path.join(ROOT, 'scripts/build_content_board.js'));

const board = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/content-board.json'), 'utf8'));
const fresh = B.build();

let passed = 0;
const failures = [];
const test = (name, fn) => {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); } catch (e) { failures.push([name, e.message]); console.log(`  ✗ ${name}\n      ${e.message}`); }
};

console.log('\n专业内容完整性看板\n');

test('看板与重算一致（数字不是手写的）', () => {
  assert.strictEqual(board.kpi.subjects, fresh.kpi.subjects);
  assert.strictEqual(board.kpi.chaptersTarget, fresh.kpi.chaptersTarget);
  assert.strictEqual(board.kpi.chaptersBuilt, fresh.kpi.chaptersBuilt);
  assert.strictEqual(board.kpi.syndromes, fresh.kpi.syndromes);
  assert.strictEqual(board.kpi.syndromeUnits, fresh.kpi.syndromeUnits);
  assert.strictEqual(board.kpi.formulas, fresh.kpi.formulas);
  assert.strictEqual(board.kpi.istt, fresh.kpi.istt);
});

test('单元数 ≠ 证候数：必须同时报，且重复对能点名', () => {
  assert.ok(board.kpi.syndromeUnits > board.kpi.syndromes, '单元数应大于不同证候数');
  const dups = board.syndromeDetail.duplicates;
  assert.strictEqual(dups.length, board.kpi.syndromeUnits - board.kpi.syndromes, '重复对数 = 单元数 - 不同证候数');
  for (const d of dups) {
    assert.strictEqual(d.count, 2, `${d.label} 应为 2 条单元`);
    assert.strictEqual(d.uids.length, 2);
    assert.ok(/^DSU-\d{5}$/.test(d.uids[0]), 'uid 形态');
  }
});

test('教材汉字取 totals.hanzi，不许用非空白字符冒充', () => {
  const tb = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/textbook-board.json'), 'utf8'));
  assert.strictEqual(board.kpi.hanzi, tb.totals.hanzi);
  assert.strictEqual(board.kpi.nonWs, tb.totals.nonWs);
  assert.ok(board.kpi.hanzi < board.kpi.nonWs, '汉字数必须小于非空白字符数（含标点）');
});

test('无结构化数据集的层记 n/a，不许写 0%', () => {
  for (const key of ['formula', 'herb', 'acupoint']) {
    const layer = board.layers.find((l) => l.key === key);
    assert.ok(layer, `${key} 层必须存在`);
    assert.strictEqual(layer.cover, null, `${key} 没有结构化数据集，覆盖率应为 null`);
  }
});

test('盘上章节目录与 catalog 对得上（33 个都有 docs/quiz/outputs）', () => {
  assert.strictEqual(board.disk.dirs, board.kpi.chaptersBuilt);
  assert.strictEqual(board.disk.withDocs, board.disk.dirs, '每章都应有 docs');
  assert.strictEqual(board.disk.mismatched.length, 0, `catalog 与磁盘不一致：${JSON.stringify(board.disk.mismatched)}`);
});

test('七层齐全，且每层都带缺口', () => {
  assert.strictEqual(board.layers.length, 7);
  for (const l of board.layers) {
    assert.ok(l.name && l.have && l.target, `${l.key} 缺字段`);
    assert.ok(Array.isArray(l.gaps) && l.gaps.length > 0, `${l.key} 必须写明缺口，不能只报好消息`);
  }
});

test('缺口清单覆盖六类，且每类都带补法', () => {
  const kinds = board.gaps.map((g) => g.kind);
  for (const k of ['教材缺稿', '章节未建', '教材过薄', '结构化层缺位', '视频缺位', '证候重复单元']) {
    assert.ok(kinds.includes(k), `缺 ${k}`);
  }
  for (const g of board.gaps) assert.ok(g.fix && g.fix.length > 8, `${g.kind} 的补法太笼统`);
});

test('教材缺稿学科数 + 有稿学科数 = 学科总数', () => {
  const noBook = board.gaps.find((g) => g.kind === '教材缺稿').n;
  assert.strictEqual(board.kpi.textbookSubjects + noBook, board.kpi.subjects);
});

test('院系矩阵合计与 KPI 一致', () => {
  const t = (f) => board.departments.reduce((n, d) => n + d[f], 0);
  assert.strictEqual(t('subjects'), board.kpi.subjects);
  assert.strictEqual(t('chaptersTarget'), board.kpi.chaptersTarget);
  assert.strictEqual(t('chaptersBuilt'), board.kpi.chaptersBuilt);
  assert.strictEqual(t('textbookSubjects'), board.kpi.textbookSubjects);
  assert.strictEqual(t('hanzi'), board.kpi.hanzi);
});

test('假设口径单列，不混进结论', () => {
  assert.ok(Array.isArray(board.assumptions) && board.assumptions.length >= 2);
  assert.ok(board.assumptions.some((a) => /300/.test(a)), '证候目标 300 必须标注为假设');
});

test('HTML 已生成且含七层与缺口', () => {
  const html = fs.readFileSync(path.join(ROOT, 'content-board.html'), 'utf8');
  assert.ok(html.includes('中医药专业内容完整性看板'));
  for (const l of board.layers) assert.ok(html.includes(l.name), `HTML 缺 ${l.name}`);
  assert.ok(html.includes('口径假设'), 'HTML 必须带口径说明');
});

console.log(`\n  ${passed} 通过 · ${failures.length} 失败`);
if (failures.length) { for (const f of failures) console.error(`  · ${f[0]}: ${f[1]}`); process.exit(1); }
