'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  DOC, CHAPTER, TITLE, read, cnToNum, sections, tables, tableBy, col,
  facts, weakestLevel, cadence, dryYears, summary,
} = require('./main.js');

const TEXT = read();
const S = summary(TEXT);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC));
  assert.ok(DOC.endsWith(path.join('chapters', '04-e74', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 4);
  assert.strictEqual(TITLE, '会看病与会讲课是两种手艺，多数老师只被训练过其中一种');
  assert.ok(TEXT.startsWith('# 第 4 章'));
});

test('师资台阶四行四列，逐级都有判据与越级形态', () => {
  const t = tableBy(TEXT, '台阶');
  assert.deepStrictEqual(t.header, ['台阶', '做什么', '判据', '常见越级']);
  assert.strictEqual(t.rows.length, 4);
  assert.deepStrictEqual(S.ladder, ['助课', '独立授课', '带教', '带徒']);
  for (const r of t.rows) {
    assert.ok(r[col(t, '判据')].length > 4);
    assert.ok(r[col(t, '常见越级')].length > 2);
  }
});

test('断层落在第三级，且第三级确实是带教', () => {
  const w = weakestLevel(TEXT);
  assert.deepStrictEqual(w, { no: 3, name: '带教' });
  assert.strictEqual(S.ladder[w.no - 1], w.name);
  assert.match(TEXT, /没有课时记录，没有教学津贴，出了事还要担责/);
});

test('教研室四件事的频次分布：周 2、月 1、学期 1', () => {
  const c = cadence(facts(TEXT).activities);
  assert.strictEqual(c.rows.length, 4);
  assert.deepStrictEqual(c.counts, { 周: 2, 月: 1, 学期: 1 });
  assert.strictEqual(S.noPaper, 4);
});

test('三年推演取到三个年份，学生不再问发生在第二年', () => {
  const d = dryYears(TEXT);
  assert.deepStrictEqual(d.years, [1, 2, 3]);
  assert.strictEqual(d.stopAskingAt, 2);
  assert.match(TEXT, /第二年，学生开始问「这个方您用过吗」/);
});

test('教学能力五个可观察项从正文第五节取到', () => {
  assert.deepStrictEqual(S.indicators, [
    '课堂提问的质量', '病例选择的难度', '学生病历的修改率',
    '带教门诊量与跟诊学生数', '学生独立接诊的例数',
  ]);
  assert.strictEqual(S.indicators.length, 5);
});

test('章节共六节，代价与边界单列', () => {
  const titles = sections(TEXT).map((s) => s.title);
  assert.strictEqual(titles.length, 6);
  assert.ok(titles[5].includes('代价与边界'));
  assert.ok(tables(TEXT).length >= 2);
});

test('脚本可运行，输出断层级、频次分布与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /断层在第 3 级「带教」/);
  assert.match(out, /5 个可观察项/);
  assert.match(out, /第 2 年学生不再问了/);
  assert.match(out, /不构成诊疗/);
  assert.ok(out.split('\n').every((l) => !/undefined|NaN/.test(l)), '输出里有未取到的字段');
});
