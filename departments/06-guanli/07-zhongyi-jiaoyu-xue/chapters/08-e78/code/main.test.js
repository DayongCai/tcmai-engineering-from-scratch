'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  DOC, CHAPTER, TITLE, read, sections, tables, tableBy, col,
  facts, alternatives, keyGate, planKeys, ethics, summary,
} = require('./main.js');

const TEXT = read();
const S = summary(TEXT);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC));
  assert.ok(DOC.endsWith(path.join('chapters', '08-e78', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 8);
  assert.strictEqual(TITLE, '教育改革的证据链很短：多数「有效」只测了满意度');
  assert.ok(TEXT.startsWith('# 第 8 章'));
});

test('四类问题各有最低证据，越级的是因果类', () => {
  const t = tableBy(TEXT, '问题类型');
  assert.strictEqual(t.rows.length, 4);
  assert.deepStrictEqual(S.questions, ['描述', '相关', '因果', '机制']);
  assert.deepStrictEqual(S.overreach, ['因果']);
  const causal = t.rows.find((r) => r[col(t, '问题类型')] === '因果');
  assert.match(causal[col(t, '常见越级')], /单组前后测/);
});

test('单组前后测漏掉三个替代解释：成熟、工具、霍桑', () => {
  assert.deepStrictEqual(alternatives(TEXT), ['成熟效应', '工具效应', '霍桑效应']);
  assert.strictEqual(alternatives(TEXT).length, 3);
});

test('五种伪证与真研究三样都从正文取到', () => {
  assert.deepStrictEqual(S.fakes, ['满意度上升', '考试分数上升', '通过率上升', '学生自评能力提升', '名师效应']);
  assert.deepStrictEqual(S.needs, ['一个对照', '一次延迟测', '一个行为指标']);
  assert.strictEqual(S.fakes.length, 5);
  assert.strictEqual(S.needs.length, 3);
  assert.match(TEXT, /如果只能做一件事，做延迟测/);
});

test('四条改革线取到，成败归因于岗位设置', () => {
  assert.deepStrictEqual(S.lines, ['整合课程与早临床', '师承嵌入院校', '模拟与数字化', '毕业后教育衔接']);
  assert.strictEqual(S.lines.length, 4);
  assert.match(TEXT, /两件事的成败都不在理念，在岗位设置/);
});

test('三道门里最关键的是第三道「责任」', () => {
  const gates = facts(TEXT).gates;
  assert.deepStrictEqual(S.gates, ['批准', '时间', '责任']);
  assert.deepStrictEqual(keyGate(TEXT, gates), { no: 3, name: '责任' });
});

test('方案骨架五项、伦理三条', () => {
  const keys = planKeys(facts(TEXT).sec5.body);
  assert.deepStrictEqual(keys, ['问题', '干预', '对照', '指标', '退出条件']);
  assert.strictEqual(keys.length, 5);
  assert.strictEqual(ethics(TEXT).length, 3);
  assert.ok(ethics(TEXT).some((x) => /脱敏/.test(x)));
});

test('章节共六节，代价与边界单列', () => {
  const titles = sections(TEXT).map((s) => s.title);
  assert.strictEqual(titles.length, 6);
  assert.ok(titles[5].includes('代价与边界'));
  assert.ok(tables(TEXT).length >= 2);
});

test('脚本可运行，输出替代解释、三道门与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /漏掉 3 个替代解释：成熟效应、工具效应、霍桑效应/);
  assert.match(out, /最关键的是第 3 道「责任」/);
  assert.match(out, /方案骨架 5 项/);
  assert.match(out, /不构成诊疗/);
  assert.ok(out.split('\n').every((l) => !/undefined|NaN/.test(l)), '输出里有未取到的字段');
});
