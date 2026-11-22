'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, parseDoc, analyze, identifierRows } = require('./main.js');

const text = () => fs.readFileSync(DOC, 'utf8');
const doc = () => parseDoc(text());

test('正文可解析：章号、标题、结构齐', () => {
  const d = doc();
  assert.strictEqual(d.chapterNo, 10);
  assert.match(d.title, /多源数据的红线/);
  assert.ok(d.sections.length >= 5);
  assert.ok(d.hanzi > 2000);
});

test('准标识符叠加表四行齐全，唯一性与等价类可读', () => {
  const rows = identifierRows(doc());
  assert.strictEqual(rows.length, 4);
  assert.deepStrictEqual(rows.map((r) => r.unique), [12, 47, 78, 91]);
  assert.deepStrictEqual(rows.map((r) => r.medianClass), [8, 2, 1, 1]);
});

test('增量由相邻两行相减得出，最大跳变定位到模态分型', () => {
  const a = analyze(doc());
  assert.deepStrictEqual(a.jumps, [35, 31, 13]);
  assert.strictEqual(a.maxJump, 35);
  assert.match(a.maxJumpAt, /就诊日期/);
  assert.strictEqual(a.monotone, true);
  assert.strictEqual(a.medianShrinks, true);
});

test('库规模与被唯一锁定的人数可复算', () => {
  const a = analyze(doc());
  assert.strictEqual(a.pool, 50000);
  assert.strictEqual(a.finalUnique, 91);
  assert.strictEqual(a.uniquePersons, 45500);
});

test('改正文的最后一档唯一性，锁定人数随之变化（证明确实现算）', () => {
  const mutated = text().replace('| + 脉图分型（5 类） | 91% | 1 |', '| + 脉图分型（5 类） | 70% | 1 |');
  assert.notStrictEqual(mutated, text(), '替换未命中，正文表述可能已改');
  const a = analyze(parseDoc(mutated));
  assert.strictEqual(a.finalUnique, 70);
  assert.strictEqual(a.uniquePersons, 35000);
});

test('脚本可运行且输出含边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], {
    encoding: 'utf8',
    timeout: 60000,
  });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /准标识符叠加/);
  assert.match(out, /最大跳变/);
  assert.match(out, /不构成法律意见、合规结论或监管建议/);
});
