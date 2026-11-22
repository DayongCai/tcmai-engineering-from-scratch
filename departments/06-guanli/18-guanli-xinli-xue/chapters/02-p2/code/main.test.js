'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { DOC, CHAPTER, TITLE, read, sections, phases, span, overlaps, theory, decompose, retention } = require('./main.js');

const TEXT = read();

test('正文文件就在本章目录下', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '02-p2', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 2);
  assert.strictEqual(TITLE, '霍桑实验真正证明的，是「被观察」本身会改变结果');
  assert.ok(TEXT.startsWith('# 第 2 章'));
});

test('三段实验从正文年份解析：照明／继电器／绕线', () => {
  const ps = phases(TEXT);
  assert.strictEqual(ps.length, 3);
  assert.deepStrictEqual(ps.map((p) => p.name), ['照明实验', '继电器装配实验', '绕线工观察']);
  assert.deepStrictEqual(ps.map((p) => [p.from, p.to]), [[1924, 1927], [1927, 1932], [1931, 1932]]);
  assert.deepStrictEqual(ps.map((p) => p.years), [3, 5, 1]);
});

test('总跨度 8 年，且继电器与绕线并行 1 年', () => {
  const ps = phases(TEXT);
  assert.deepStrictEqual(span(ps), { from: 1924, to: 1932, years: 8, phases: 3 });
  const ov = overlaps(ps);
  assert.strictEqual(ov.length, 1);
  assert.deepStrictEqual(ov[0].pair, ['继电器装配实验', '绕线工观察']);
  assert.strictEqual(ov[0].years, 1);
});

test('三支理论、四源自我效能、四家本土资源都在正文里', () => {
  const th = theory(TEXT);
  assert.deepStrictEqual(th.branches, ['行为主义', '认知取向', '人本主义']);
  assert.strictEqual(th.efficacy.length, 4);
  assert.ok(th.efficacy.includes('替代经验'));
  assert.deepStrictEqual(th.schools, ['儒家', '道家', '法家', '兵家']);
});

test('试点涨幅分解：12% 与 4% → 方案 4 点、被关注 8 点', () => {
  const d = decompose(12, 4);
  assert.strictEqual(d.scheme, 4);
  assert.strictEqual(d.monitoring, 8);
  assert.strictEqual(d.monitoringShare, 0.6667);
  assert.strictEqual(d.scheme + d.monitoring, d.pilotGain);
});

test('留存一半时判定为「随关注退潮」，不是方案站得住', () => {
  const d = decompose(12, 4);
  const r = retention(2, d);
  assert.strictEqual(r.keep, 0.5);
  assert.match(r.verdict, /随关注退潮/);
  assert.match(retention(5, d).verdict, /站得住/);
  assert.match(retention(0, d).verdict, /不能按试点数据推广/);
});

test('霍桑效应的判据与两条边界在正文里', () => {
  for (const k of ['被测者会因被测而改变', '设了对照组', '非正式组织', '社会人']) {
    assert.ok(TEXT.includes(k), k);
  }
  assert.strictEqual(sections(TEXT).length, 6);
});

test('脚本可运行，输出含分解后的试点账与边界声明', () => {
  const r = require('node:child_process').spawnSync(process.execPath, [path.join(__dirname, 'main.js')], {
    encoding: 'utf8',
    timeout: 60000,
  });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /被关注占涨幅 66\.7%/);
  assert.match(out, /总跨度 1924—1932/);
  assert.match(out, /不构成任何具体方案的推广建议/);
});
