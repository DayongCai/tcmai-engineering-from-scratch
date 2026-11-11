#!/usr/bin/env node
/**
 * tests/test_std_mapping.js —— 底本目录 → 课程学科的映射不许有隐形课程
 *
 * 病根：底本目录按书名/教材名起（neike、zhongyao-xue、binglishengli、shanghan），
 * 课程 slug 是另一个名字（10-zhongyi-neike-xue、01-zhongyaoxue…）。解析不到时不会报错，
 * 整门课就静默显示「单元 0」——2026-11-09/10 两次都是这么漏的（伤寒/金匮/温病 1,430 单元、
 * 中医内科学/中药学/病理生理学 940 单元）。
 *
 * 这里钉三件事：
 *   1. 未挂课底本只有一处：汇通期的《医学衷中参西录》（有底本、无课程载体，故意保留）；
 *   2. 曾经隐形过的三门课，单元数必须大于 0（回归守卫）；
 *   3. 重复目录只允许已知那一对（字节级同源副本）。
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SPHERE = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/kt-sphere.json'), 'utf8'));

let passed = 0;
const failures = [];
const test = (name, fn) => {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); } catch (e) { failures.push([name, e.message]); console.log(`  ✗ ${name}\n      ${e.message}`); }
};

console.log('\n底本目录映射\n');

test('未挂课底本为空（2026-11-10 汇通期建课后清零）', () => {
  const dirs = (SPHERE.unmapped || []).map((u) => u.dir).sort();
  assert.deepStrictEqual(dirs, [],
    `未挂课底本：${dirs.join('、') || '（空）'} —— 新出现的说明又有底本没挂上课`);
});

test('汇通期选读课解析到 zhongcan-xilu，534 单元全部挂上', () => {
  const s = SPHERE.subjects.find((x) => x.slug === '23-zhongcan-xilu-xuandu');
  assert.ok(s, '知识树里没有 23-zhongcan-xilu-xuandu');
  assert.strictEqual(s.std, 'zhongcan-xilu');
  assert.strictEqual(s.units, 534, `选读课单元 ${s.units}，应为 534`);
  assert.strictEqual(s.chapters, 10);
});

test('曾经隐形的三门课，单元数必须 > 0（回归守卫）', () => {
  const want = { '中医内科学': 384, '中药学': 340, '病理生理学': 216 };
  for (const [title, n] of Object.entries(want)) {
    const s = SPHERE.subjects.find((x) => x.title === title);
    assert.ok(s, `找不到学科 ${title}`);
    assert.strictEqual(s.units, n, `${title} 单元 ${s.units}，应为 ${n}（别名可能又被改掉了）`);
    assert.ok(s.std, `${title} 的 std 为空 —— 底本没解析上`);
  }
});

test('三个典籍课的底本解析到书名目录', () => {
  const map = { 伤寒论: 'shanghan', 金匮要略: 'jingui', 温病学: 'wenbing' };
  for (const [title, dir] of Object.entries(map)) {
    const s = SPHERE.subjects.find((x) => x.title === title);
    assert.strictEqual(s.std, dir, `${title} 解析到 ${s.std || '空'}，应为 ${dir}`);
    assert.ok(s.units > 0, `${title} 单元为 0`);
  }
});

test('重复底本目录只有已知三对（同源教材/派生课，不是新漏）', () => {
  const pairs = (SPHERE.duplicateDirs || []).map((d) => d.dirs.slice().sort().join('|')).sort();
  const known = [
    '17-guanli-xue-jichu|guanli-xue-jichu',
    'huli-zonghe-jineng|jichu-huli',
    'kouqiang-neike-xue|zhongyi-kouqiang-kexue',
  ].sort();
  assert.deepStrictEqual(pairs, known,
    `重复目录：${pairs.join('、') || '（空）'} —— 与已知三对不符`);
});

test('全库单元合计 = 各学科单元之和（计数不悬空）', () => {
  const sum = SPHERE.subjects.reduce((a, s) => a + s.units, 0);
  assert.strictEqual(SPHERE.totals.units, sum, `totals ${SPHERE.totals.units} ≠ 学科和 ${sum}`);
});

if (failures.length) {
  console.log(`\n  ${passed} 通过 · ${failures.length} 失败\n`);
  process.exit(1);
}
console.log(`\n  ${passed} 通过 · 0 失败\n\n✅ 底本映射通过\n`);
