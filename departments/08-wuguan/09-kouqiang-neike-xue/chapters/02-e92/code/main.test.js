'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const m = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const CHAPTERS = path.join(__dirname, '..', '..', '..', 'chapters.json');

test('章节号与课程清单一致', () => {
  const list = JSON.parse(fs.readFileSync(CHAPTERS, 'utf8')).chapters;
  const row = list.find((c) => c.slug === m.SLUG);
  assert.ok(row, `chapters.json 里没有 ${m.SLUG}`);
  assert.strictEqual(row.n, m.CHAPTER);
  assert.strictEqual(m.audit().title, row.title);
});

test('正文可读，小节都在', () => {
  assert.ok(m.audit().sections.length >= 6);
});

test('三种挂法都在正文里', () => {
  const a = m.audit();
  assert.deepStrictEqual(a.attach, m.ATTACH);
});

test('五个固定说法都能在正文找到', () => {
  const a = m.audit();
  assert.deepStrictEqual(a.claims, m.CLAIMS);
});

test('经络归属表七星，上胃下大肠的分工成立', () => {
  const a = m.audit();
  assert.strictEqual(a.meridianRows, 7);
  assert.ok(a.upperToStomach && a.lowerToLargeIntestine);
  assert.ok(a.meridians.some((x) => x.includes('手阳明')));
  assert.ok(a.meridians.some((x) => x.includes('足少阴')));
});

test('涎与唾在正文里都出现且分属两脏', () => {
  const a = m.audit();
  assert.ok(a.saliva['涎'] > 0 && a.saliva['唾'] > 0);
  const doc = m.readDoc();
  assert.ok(doc.includes('脾为涎') && doc.includes('肾为唾'));
});

test('两处翻译边界都在正文里', () => {
  const a = m.audit();
  assert.ok(a.boundaryEmbryo && a.boundaryAxis);
});

test('脚本可运行且带边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /教学样例/);
  assert.match(r.stdout, /不构成临床判断依据/);
});
