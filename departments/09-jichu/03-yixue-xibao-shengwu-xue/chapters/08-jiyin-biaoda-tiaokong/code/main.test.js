'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  readDoc,
  unitRange,
  unitRank,
  adjustablePoints,
  usableWithin,
  extremes,
  modifications,
  readWriteErase,
  threeQuestions,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('正文是本章那一份', () => {
  const doc = readDoc();
  assert.ok(doc.includes('增强子') && doc.includes('中心法则'));
  assert.ok((doc.match(/[\u4e00-\u9fff]/g) || []).length > 2000);
});

test('时间尺度拆两端：秒到小时 → 1 起 3 止', () => {
  assert.deepStrictEqual(unitRange('秒到小时'), { fast: 1, slow: 3 });
  assert.deepStrictEqual(unitRange('分钟到小时'), { fast: 2, slow: 3 });
  assert.deepStrictEqual(unitRange('分钟'), { fast: 2, slow: 2 });
  assert.deepStrictEqual(unitRange('细胞分裂的尺度'), { fast: 4, slow: 4 });
  assert.strictEqual(unitRank('秒到小时'), 1);
  assert.throws(() => unitRange('很久'));
});

test('可调点六个，覆盖转录到降解', () => {
  const pts = adjustablePoints(readDoc());
  assert.strictEqual(pts.length, 6);
  const names = pts.map((p) => p.stage).join('｜');
  assert.match(names, /转录起始/);
  assert.match(names, /染色质/);
  assert.match(names, /转录后加工/);
  assert.match(names, /出核与稳定/);
  assert.match(names, /翻译/);
  assert.match(names, /修饰与降解/);
  for (const p of pts) assert.ok(p.fastRank >= 1 && p.slowRank <= 4, '刻度越界');
});

test('时限一收紧，可用的层就变少', () => {
  const doc = readDoc();
  const s = usableWithin(1, doc);
  assert.deepStrictEqual(s, ['修饰与降解']);
  assert.ok(usableWithin(2, doc).length > s.length);
  assert.ok(usableWithin(3, doc).length >= usableWithin(2, doc).length);
  assert.throws(() => usableWithin(0, doc));
  assert.throws(() => usableWithin(5, doc));
});

test('最快与最慢两端都落在表内', () => {
  const ex = extremes(readDoc());
  assert.strictEqual(ex.fastest, '修饰与降解');
  const stages = adjustablePoints(readDoc()).map((p) => p.stage);
  assert.ok(stages.includes(ex.slowest));
});

test('修饰表 5 条，含 H3K27 与 CpG', () => {
  const mods = modifications(readDoc());
  assert.strictEqual(mods.length, 5);
  const all = mods.map((m) => m.mark).join('｜');
  assert.match(all, /H3K27/);
  assert.match(all, /CpG/);
  assert.match(all, /乙酰化/);
});

test('读—写—擦三个动作', () => {
  assert.deepStrictEqual(readWriteErase(readDoc()).cycle, ['读', '写', '擦']);
});

test('三层追问齐', () => {
  const q = threeQuestions(readDoc());
  assert.strictEqual(q.length, 3);
  assert.match(q[0], /哪一层/);
  assert.match(q[1], /可逆/);
  assert.match(q[2], /平均|分布/);
});

test('脚本可跑，输出含时限判断与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /要在秒级内起效/);
  assert.match(out, /不引入新数值/);
  assert.match(out, /不构成临床判断依据/);
});

test('代码头部指向本章正文', () => {
  assert.ok(fs.readFileSync(MAIN, 'utf8').includes('/08-jiyin-biaoda-tiaokong/docs/zh.md'));
});
