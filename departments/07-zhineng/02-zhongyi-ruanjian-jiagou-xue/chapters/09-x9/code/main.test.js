'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const m = require('./main.js');

test('正文存在且章号一致', () => {
  const a = m.analyze(m.readDoc());
  assert.strictEqual(a.chapter, 9);
  assert.ok(a.title.startsWith('第 9 章'), a.title);
});

test('汉字数由正文现算，不写死', () => {
  const text = m.readDoc();
  assert.strictEqual(m.analyze(text).hanzi, (text.match(/[\u4e00-\u9fff]/g) || []).length);
  assert.ok(m.analyze(text).hanzi >= 2500);
});

test('节与表格行都从正文读出', () => {
  const text = m.readDoc();
  const a = m.analyze(text);
  assert.strictEqual(a.sectionCount, text.split(/\r?\n/).filter((l) => /^##\s+/.test(l)).length);
  assert.ok(a.sectionCount >= 5);
  assert.ok(a.tableRows >= 4);
  assert.ok(a.sections.includes('代价与边界'));
});

test('关键词全部在正文出现，计数可复算', () => {
  const text = m.readDoc();
  const a = m.analyze(text);
  assert.ok(a.terms.length >= 5);
  for (const t of a.terms) {
    assert.ok(t.count > 0, t.term);
    assert.strictEqual(t.count, text.split(t.term).length - 1);
  }
});

test('主线句出自正文', () => {
  assert.strictEqual(m.THESIS, "知识层与事件层必须分开");
  assert.ok(m.readDoc().includes(m.THESIS));
});

test('结构自检无违规', () => {
  assert.deepStrictEqual(m.assertShape(m.analyze(m.readDoc())), []);
});

test('脚本可运行并输出教学与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], {
    encoding: 'utf8',
    timeout: 60000,
  });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /第 9 章/);
  assert.match(out, /汉字 · /);
  assert.match(out, /结构自检通过/);
  assert.match(out, /不构成诊疗、用药或信息化决策建议/);
});
