#!/usr/bin/env node
/**
 * 第 2 章 君臣佐使 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言分两类：
 *   1) 结构类：角色覆盖、齐备度、留空规则——这些必须稳定，变了就是数据层变了
 *   2) 欠账类：抽取边界（并列君药被截断）——断言它存在，防止有人「顺手修好」
 *      而丢掉了「抽不到就留空、不猜」的口径
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  ROLES,
  load,
  chapterHanzi,
  roleCoverage,
  rolesPerFormula,
  atLeast3,
  allFour,
  withoutJun,
  multiRole,
  truncatedJun,
  compareRoles,
} = require('./main');

const fj = load();

test('角色覆盖：君 105 / 臣 79 / 佐 96 / 使 40，分母恒为 114', () => {
  assert.strictEqual(fj.formulas.length, 114);
  assert.strictEqual(roleCoverage(fj, '君').n, 105);
  assert.strictEqual(roleCoverage(fj, '臣').n, 79);
  assert.strictEqual(roleCoverage(fj, '佐').n, 96);
  assert.strictEqual(roleCoverage(fj, '使').n, 40);
  for (const r of ROLES) {
    assert.ok(roleCoverage(fj, r.key).n <= 114, `${r.label} 的覆盖数超过方数`);
  }
});

test('齐备度：三角色以上 80、四角色齐 18，且 18 ≤ 80 ≤ 105', () => {
  const k3 = atLeast3(fj);
  const k4 = allFour(fj);
  assert.strictEqual(k3, 80);
  assert.strictEqual(k4, 18);
  assert.ok(k4 <= k3 && k3 <= roleCoverage(fj, '君').n);
  // 齐备度数的是「有几种角色」，任何一方都不会超过 4
  assert.ok(rolesPerFormula(fj).every((x) => x.k >= 0 && x.k <= 4));
});

test('抽不到君药的 9 首：留空，不代填', () => {
  const noJun = withoutJun(fj);
  assert.strictEqual(noJun.length, 9);
  assert.strictEqual(noJun.length + roleCoverage(fj, '君').n, 114);
  assert.ok(noJun.includes('十枣汤'), '十枣汤是教材未标君药的典型');
  for (const name of noJun) {
    const f = fj.formulas.find((x) => x.name === name);
    assert.deepStrictEqual(f.roles['君'], [], `${name} 的君药被填上了——留空规则被破坏`);
  }
});

test('一药兼数职 7 方：桂枝汤的芍药同时居臣与佐', () => {
  const multi = multiRole(fj);
  assert.strictEqual(multi.length, 7);
  const guizhi = multi.find((m) => m.name === '桂枝汤');
  assert.ok(guizhi, '桂枝汤应在一药兼数职之列');
  const herb = guizhi.herbs.find(([h]) => h === '芍药');
  assert.ok(herb, '芍药应被记为一药兼数职');
  assert.ok(/臣/.test(herb[1]) && /佐/.test(herb[1]), `芍药的角色串异常: ${herb[1]}`);
  // 生脉散的三味组成已由上游抽取器补齐，人参同时落在君位与臣位
  const shengmai = multi.find((m) => m.name === '生脉散');
  assert.ok(shengmai, '生脉散应在一药兼数职之列');
  assert.deepStrictEqual(shengmai.herbs.find(([h]) => h === '人参'), ['人参', '君/臣']);
});

test('抽取边界可数：23 首方的方解写了并列君药，roles.君 却只留 1 味', () => {
  const trunc = truncatedJun(fj);
  assert.strictEqual(trunc.length, 23);
  const xiao = trunc.find((t) => t.name === '小青龙汤');
  assert.ok(xiao, '小青龙汤方解作「麻黄、桂枝并为君药」，应被计为截断例');
  assert.strictEqual(xiao.kept, '麻黄');
});

test('同法两方逐角色对照：麻黄的层次在麻黄汤为君、在桂枝汤为臣', () => {
  const cmp = compareRoles(fj, '麻黄汤', '桂枝汤');
  const byRole = Object.fromEntries(cmp.map((r) => [r.role, r]));
  assert.strictEqual(byRole['君药'].a, '麻黄');
  assert.strictEqual(byRole['君药'].b, '桂枝');
  assert.strictEqual(byRole['臣药'].a, '桂枝');
  // 桂枝汤的使药抽不到，必须显示为空而不是补一个甘草
  assert.strictEqual(byRole['使药'].b, '（空）');
});

test('本章教材字数与底本一致：第3章 13122 字', () => {
  assert.strictEqual(chapterHanzi(3), 13122);
});
