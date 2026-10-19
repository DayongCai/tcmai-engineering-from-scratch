#!/usr/bin/env node
/**
 * tests/test_shaoyin_source.js —— 少阴外源补录的完整性与可复跑性
 *
 * 断言三件事：
 *   1. sha256 与 JSON 里登记的一致（源文件没被悄悄改过）
 *   2. 解析结果稳定（45 条 / 15 方 / 0 警告），且解析器只在 source.md 上工作
 *   3. 外源不污染底本：底本仍是 27 篇 / 1760 条，且不含少阴提纲
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const { parse } = require('../scripts/parse_shaoyin');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'standards/shanghan/shaoyin/source.md');
const JSON_PATH = path.join(ROOT, 'standards/shanghan/shaoyin/shaoyin.json');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/shanghan/底本.json'), 'utf8'));

test('源文件与 JSON 登记的 sha256 一致', () => {
  const buf = fs.readFileSync(SRC);
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  const j = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  assert.strictEqual(j.sourceSha256, sha);
  assert.strictEqual(j.source, '外源·搜狐2019');
  assert.match(j.url, /sohu\.com\/a\/351941130/);
});

test('解析稳定：45 条 · 15 方 · 14 加减 · 0 警告', () => {
  const r = parse(fs.readFileSync(SRC, 'utf8'));
  assert.strictEqual(r.tiao.length, 45);
  assert.strictEqual(r.formulas.length, 15);
  assert.strictEqual(r.formulas.reduce((a, f) => a + f.additions.length, 0), 14);
  assert.deepStrictEqual(r.warnings, []);
});

test('每条条文都有正文字段，且首条为少阴提纲', () => {
  const r = parse(fs.readFileSync(SRC, 'utf8'));
  assert.ok(r.tiao.every((t) => typeof t.text === 'string' && t.text.endsWith('。')));
  assert.strictEqual(r.tiao[0].text, '少阴之为病，脉微细，但欲寐也。');
  assert.ok(r.tiao.every((t, i) => t.no === i + 1));
});

test('每方都有组方，且至少 12 方带煎服法', () => {
  const r = parse(fs.readFileSync(SRC, 'utf8'));
  assert.ok(r.formulas.every((f) => f.composition && f.composition.length >= 3), '有方缺组方');
  assert.ok(r.formulas.filter((f) => f.method).length >= 12);
});

test('外源不污染底本：底本 27 篇 / 1760 条 / 无少阴提纲', () => {
  assert.strictEqual(BOOK.pian.length, 27);
  assert.strictEqual(BOOK.pian.reduce((a, p) => a + p.actual.tiao, 0), 1760);
  const all = BOOK.pian.flatMap((p) => p.items.map((i) => i.text)).join('');
  assert.ok(!all.includes('少阴之为病'));
});

test('PROVENANCE 里登记的统计与解析结果一致', () => {
  const md = fs.readFileSync(path.join(ROOT, 'standards/shanghan/shaoyin/PROVENANCE.md'), 'utf8');
  assert.match(md, /条文 \| \*\*45\*\*/);
  assert.match(md, /方（含方名） \| \*\*15\*\*/);
  assert.match(md, /预后不良条（死／不治／难治） \| \*\*7\*\*/);
  assert.match(md, /5415941951c013ac41ae16baf113b6cbec8efa23b7b3a540c0ee34d778e6b732/);
});
